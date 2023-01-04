self.onmessage = function(event) {
  if (event.data.msg === 'init') {
    const canvas = event.data.canvas;
    const ctx = canvas.getContext('2d');
    const settings = event.data.settings;

    createImageBitmap(event.data.sourceData).then(sourceImage => {
      if (settings['padding-color']) {
        ctx.fillStyle = settings['padding-color'];
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      for (let y = 0; y < settings.yLength; y++) {
        for (let x = 0; x < settings.xLength; x++) {
          ctx.drawImage(sourceImage,
            x * settings['sprite-x'],
            y * settings['sprite-y'],
            settings['sprite-x'],
            settings['sprite-y'],
            (x * settings['sprite-x']) + (x * settings['padding-x']) + settings['buffer-x'],
            (y * settings['sprite-y']) + (y * settings['padding-y']) + settings['buffer-y'],
            settings['sprite-x'],
            settings['sprite-y']
          );
        }
      }

      self.postMessage({msg: 'render', bitmap: canvas.transferToImageBitmap()});
    });
  }
}