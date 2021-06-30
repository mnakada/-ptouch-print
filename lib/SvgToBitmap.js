//
//  SvgToBitmap.js
//
//  Copyright (C) 2021 Mitsuru Nakada
//  This software is released under the MIT License, see license file.
//

const puppeteer = require("puppeteer");
const PNG = require('pngjs').PNG;

const SvgToBitmap = async function(data, { offset = 0, height = 256, padding = 0, rotate = false, preview = false }) {
  const browser = await puppeteer.launch({
    args: ['--nosandbox'],
    headless: !preview,
  });
  const page = (await browser.pages())[0];
  await page.setContent(data);
  await page.evaluate((height, rotate, preview) => {
    const svg = document.getElementsByTagName('svg')[0];
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    if(preview) {
      svg.style.setProperty('margin', 10, 'important');
      svg.style.setProperty('border', '1px solid', 'important');
    } else {
      svg.style.setProperty('margin', 0, 'important');
      svg.style.setProperty('border', 0, 'important');
    }
    svg.style.setProperty('padding', 0, 'important');
    svg.style.setProperty('position', 'fixed', 'important');
    svg.style.setProperty('left', 0, 'important');
    svg.style.setProperty('top', 0, 'important');
    svg.style.setProperty('transform-origin', 'left top', 'important');
    if(rotate) {
      svg.style.setProperty('width', `${height}px`,  'important');
      svg.setAttribute('transform', `rotate(270, 0, 0) translate(-${height}, 0)`);
    } else {
      svg.style.setProperty('height', `${height}px`, 'important');
    }
  }, height, rotate, preview);
  const el = await page.$('svg');
  const pngData = await el.screenshot({ encoding: 'binary' });
  if(preview) {
    browser.on('targetdestroyed', async () => {
      await browser.close();
    });
  } else {
    await browser.close();
  }

  const totalHeight = offset + height + padding;
  return new Promise(resolve => {
    if(totalHeight % 8) throw new Error('size error');
    const png = new PNG().parse(pngData);
    png.on('parsed', (data) => {
      const ret = {
        bw: new Buffer.alloc(png.width * totalHeight / 8, 0),
        width: png.width,
        height: totalHeight / 8,
      };
      for(let x = 0; x < png.width; x++) {
        for(let y = 0; y < png.height; y++) {
          const idx = (y * png.width + x) << 2;
          const color = ((data[idx] === data[idx+1]) && (data[idx] === data[idx+2])) ? data[idx] :255;
          ret.bw[x * (totalHeight / 8) + parseInt((y + offset) / 8)] |= (color & 0x80 ^ 0x80) >> ((y + offset) % 8);
        }
      }
      resolve(ret);
    });
  });
}

module.exports = SvgToBitmap;
