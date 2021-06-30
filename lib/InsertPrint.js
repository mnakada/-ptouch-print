//
//  InsertPrint.js
//
//  Copyright (C) 2021 Mitsuru Nakada
//  This software is released under the MIT License, see license file.
//

const ptouchControl = require('./PTouchControl');
const svgToBitmap = require('./SvgToBitmap');
const QRCode = require('qrcode');

const InsertPrint = async function(referenceSVG, insert, options = {}) {

  console.log(options);
  const ptouch = new ptouchControl();
  // printer status check
  let status = {};
  if(!options.preview) {
    status = await ptouch.PrinterStatus();
    options.offset = status.offset;
    options.height = status.height;
    options.padding = status.padding;
  }

  // insert data
  let svgData = referenceSVG;
  for(const key in insert) { // <text>$xxx</text> to <text>hoge</text>
    if(key === 'QRCode') continue;
    svgData = svgData.replace(new RegExp(`(<text.*?>)\\$${key}(<\/text>)`, 'gm'), `$1${insert[key]}$2`);
  }
  if(insert.QRCode) { // red square to QRCode
    const rect = (svgData.match(/^.*(<rect.*?fill: *rgb\( *255, *0, *0\);.*?\/>).*$/gm)||[])[0];
    if(rect) {
      const attr = rect.split(/[ <>\/]/).reduce((r, s)=> {if(s.search(/=/)>= 0) r[s.replace(/=.*$/,'')]=s.replace(/^.*?=/,'').replace(/"/g, '');return r;}, {})
      const qrCode = await QRCode.toString(insert.QRCode, { type: 'svg', mode: 'byte', errorCorrectionLevel: 'H', width: attr.width, margin: 0 });
      svgData = svgData.replace(/<rect.*?fill: *rgb\( *255, *0, *0\);.*?\/>/, qrCode.replace(/xmlns=".*?"/, `x="${attr.x}" y="${attr.y}" style=" stroke-linecap:butt;"`));
    }
  }

  const data = await svgToBitmap(svgData, options); // convert to ptouch bitmap
  if(!options.preview) ptouch.Print(data, options.fine, options.feedCut);
  return status;
}

module.exports = InsertPrint;
