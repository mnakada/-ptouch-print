//
//  PTouchControl.js
//
//  Copyright (C) 2021 Mitsuru Nakada
//  This software is released under the MIT License, see license file.
//

const mdns = require('mdns');
const snmp = require('net-snmp');
const net = require('net');

class PTouchControl {

  constructor() {
    this.ipAddress = null;
    this.port = null;
  }

  PrinterStatus() {
    return new Promise(resolve => {
      const browser = mdns.createBrowser(mdns.tcp('pdl-datastream'));
      browser.on('serviceUp', service => {
        if(service.name.indexOf('Brother') >= 0) {
          if(this.ipAddress) return;
          this.ipAddress = service.addresses[0];
          this.port = service.port;
          browser.stop();

          const session = snmp.createSession(this.ipAddress, 'public');
          session.get(['1.3.6.1.4.1.2435.3.3.9.1.6.1.0'], (err, varbind) => {
            if(err) throw new Error(err);
            if(snmp.isVarbindError(varbind[0]))
              throw new Error(snmp.varbindError(varbind[0]));
            const status = this.PTouchStatus(varbind[0].value);
            session.close();
            resolve(status);
          });
        }
      });
      browser.start();
    });
  }

  Print(data, fine, feedCut) {
    if(!this.ipAddress || !this.port) throw new Error('not connected.');
    
    const lines = fine ? data.width << 1 : data.width;
    const client = new net.Socket();
    client.connect(this.port, this.ipAddress, () => {
      const reset = Buffer.alloc(200, 0); // nop x 200
      const init = Buffer.from([0x1b, 0x40]); // initialize
      const mode1 = Buffer.from([0x1b, 0x69, 0x61, 0x01]); // raster mode
      const info = Buffer.from([0x1b, 0x69, 0x7a, 0x80, 0, 0, 0, lines, lines >> 8, lines >> 16, lines >> 24, 2, 0]);
      const mode2 = Buffer.from([0x1b, 0x69, 0x4d, 0x40]); // autocut on / mirror off
      const autocut = Buffer.from([0x1b, 0x69, 0x41, 0x01]); // autocut qty = 1
      const extMode = Buffer.from([0x1b, 0x69, 0x4b, 0x04 | (fine ? 0x40 : 0) | (feedCut ? 0x08 : 0)]); // HalfCut, fine, feedCut
      const margin = Buffer.from([0x1b, 0x69, 0x64, 14, 0]); // margin = 14dot
      const rasterMode = Buffer.from([0x4d, 0]); // no compress
      const header = Buffer.from([0x47, data.height, data.height >> 8]); // 70 byte
      const dataList = [];
      for(let i = 0; i < data.width; i++) {
        dataList.push(header, data.bw.slice(data.height * i, data.height * (i + 1)));
        if(fine) dataList.push(header, data.bw.slice(data.height * i, data.height * (i + 1)));
      }
      const finish = Buffer.from([0x1a]);
      const req = Buffer.concat([reset, init, mode1, info, mode2, autocut, extMode, margin, rasterMode, ...dataList, finish]);
      client.write(req);
    });

    client.on('drain', () => {
      client.end();
    });
  }

  PTouchStatus(info) {
    if([0x80, 0x20, 0x42, 0x30].some((v, idx) => v !== info[idx]))
      throw new Error('status format error');

    const model = {
      111: 'PT-P900W',
      112: 'PT-P950NW',
      113: 'PT-P900',
      120: 'PT-P910BT',
    }[info[4]];

   const errex = {
     16: 'FLE のテープエンド',
     29: '高解像度/ドラフト印刷エラー',
     30: 'アダプター抜き挿しエラー',
     33: '非対応メディアエラー',
    }[info[7]];

   const err1 = ['メディア無し', 'メディア終了', 'カッタージャム', 'バッテリー弱',
     '本体使用中', '未使用', '高圧アダプター', '未使用'].reduce((err, str, bit) =>
     err + ((info[8] & (1 << bit)) ? `${str}${bit}${(info[8] & (1 << bit))}` : ''), '');
   const err2 = ['メディア交換(メディア違い)', 'バッファーフル', '通信エラー', '通信バッファーフル',
     'カバーオープン', '高温エラー', '先端検出エラー', 'システムエラー'].reduce((err, str, bit) =>
      err + ((info[9] & (1 << bit)) ? str : ''), '');

    if(info[7] || info[8] || info[9])
      throw new Error(`${ model }, ${ errex, err1, err2}`);

    const mediaWidth = {
      0: 'テープなし',
      4: '3.5mm',
      6: '6mm',
      9: '9mm',
      12: '12mm',
      18: '18mm',
      21: '21mm',
      24: '24mm',
      36: '36mm',
    }[info[10]];

    const media = {
      0: 'テープなし',
      1: 'ラミネート',
      3: 'ノンラミネート',
      4: 'ファブリック',
      17: 'ヒートシュリンクチューブ',
      19: 'FLe',
      20: 'フレキシブルID',
      21: 'サテン',
      255: '非対応',
    }[info[11]];

    const tapeColor = {
      1: '白',
      2: 'その他',
      3: '透明',
      4: '赤',
      5: '青',
      6: '黄',
      7: '緑',
      8: '黒',
      9: '透明（文字白）',
      32: '白（マット）',
      33: '透明（マット）',
      34: '銀（マット）',
      35: '金（マット）',
      36: '銀（サテン）',
      48: '青(D)',
      49: '赤(D)',
      64: 'オレンジ（蛍光）',
      65: '黄（蛍光）',
      80: 'ピンク(S)',
      81: 'グレー(S)',
      82: 'グリーン(S)',
      96: 'イエロー(F)',
      97: 'ピンク(F)',
      98: 'ブルー(F)',
      112: '白（チューブ）',
      144: '白（フレキ）',
      145: '黄（フレキ）',
      240: 'クリーニング',
      241: 'ステンシル',
      255: '非対応',
    }[info[24]];

    const color = {
      1: '白',
      2: 'その他',
      4: '赤',
      5: '青',
      8: '黒',
      10: '金',
      98: 'ブルー(F)',
      240: 'クリーニング',
      241: 'ステンシル',
      255: '非対応',
    }[info[25]];

    const pins = [
      {
        0: [0, 0, 0],
        4: [248, 48, 264],
        6: [240, 64, 256],
        9: [219, 106, 235],
        12: [197, 150, 213],
        18: [155, 234, 171],
        24: [112, 320, 128],
        36: [45, 454, 61],
      },
      {
        6: [244, 56, 260],
        9: [224, 96, 240],
        12: [206, 132, 222],
        18: [166, 212, 182],
        24: [144, 256, 160],
      },
    ][(info[11] & 0x10) >> 4][info[10]];

    return {
      model,
      mediaWidth,
      tapeColor,
      media,
      color,
      offset: pins[2],
      height: pins[1],
      padding: pins[0],
    };
  }
}

module.exports = PTouchControl;
