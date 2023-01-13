'use strict';

onmessage = event => {
  if (event.data.msg === 'init') {
    const canvas = event.data.canvas;
    const ctx = canvas.getContext('2d');
    const settings = event.data.settings;

    createImageBitmap(event.data.sourceData).then(sourceImage => {
      let spriteWidth = settings['sprite-x'] + settings['padding-x'] + settings['padding-neg-x'];
      let spriteHeight = settings['sprite-y'] + settings['padding-y'] + settings['padding-neg-y'];

      let offsetWidth = settings['buffer-neg-x'] + settings['padding-neg-x'];
      let offsetHeight = settings['buffer-y'] + settings['padding-y'];

      if (settings['padding-color']) {
        ctx.fillStyle = settings['padding-color'];
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let y = 0; y < settings.yLength; y++) {
          for (let x = 0; x < settings.xLength; x++) {
            ctx.clearRect(
              x * spriteWidth + offsetWidth,
              y * spriteHeight + offsetHeight,
              settings['sprite-x'],
              settings['sprite-y']
            );
          }
        }
      }

      for (let y = 0; y < settings.yLength; y++) {
        for (let x = 0; x < settings.xLength; x++) {
          ctx.drawImage(sourceImage,
            x * settings['sprite-x'],
            y * settings['sprite-y'],
            settings['sprite-x'],
            settings['sprite-y'],
            x * spriteWidth + offsetWidth,
            y * spriteHeight + offsetHeight,
            settings['sprite-x'],
            settings['sprite-y']
          );
        }
      }

      if (settings['stretch-padding']) {
        for (let x = 0; x < settings.xLength; x++) {
          let stretchOffset = x * (spriteWidth) + offsetWidth;

          ctx.drawImage(canvas,
            stretchOffset,
            0,
            1,
            canvas.height,
            stretchOffset - settings['padding-neg-x'],
            0,
            settings['padding-neg-x'],
            canvas.height
          );

          stretchOffset += settings['sprite-x'];

          ctx.drawImage(canvas,
            stretchOffset - 1,
            0,
            1,
            canvas.height,
            stretchOffset,
            0,
            settings['padding-x'],
            canvas.height
          );
        }

        for (let y = 0; y < settings.yLength; y++) {
          let stretchOffset = y * (spriteHeight) + offsetHeight;

          ctx.drawImage(canvas,
            0,
            stretchOffset,
            canvas.width,
            1,
            0,
            stretchOffset - settings['padding-y'],
            canvas.width,
            settings['padding-y']
          );

          stretchOffset += settings['sprite-y'];

          ctx.drawImage(canvas,
            0,
            stretchOffset - 1,
            canvas.width,
            1,
            0,
            stretchOffset,
            canvas.width,
            settings['padding-neg-y']
          );
        }
      }

      postMessage({msg: 'render', bitmap: canvas.transferToImageBitmap()});
    });
  }
}