const dropArea = document.getElementById('drop-area');
const input = dropArea.querySelector('input');
const targetCanvas = document.getElementById('target');
const targetCtx = targetCanvas.getContext('bitmaprenderer');
const dataCanvas = document.createElement('canvas');
const dataCtx = dataCanvas.getContext('2d');
const spriteSettings = document.getElementById('sprite-settings');
const spriteImport = document.getElementById('sprite-import');

const acceptedTypes = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/x-icon'
];

let debounce = false;
let debounceTimer;
let worker;
let activeCanvas = false;
let imageName;
let pendingFile;
let dragging = false;
let scale = 1;
let maxScale;

const lastPosition = {
  x: 0,
  y: 0
};

const position = {
  x: 0,
  y: 0
};

function showModal() {
  spriteImport.reset();

  document.getElementById('modal').classList.add('show');

  spriteImport.querySelector('input').focus();
}

function hideModal() {
  document.getElementById('modal').classList.remove('show');
}

function generateSheet(initial = false) {
  const settings = {};

  dropArea.classList.add('loading');

  if (worker) {
    worker.terminate();
  }

  if (debounce) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounce = false;
      generateSheet(initial);
    }, 200);

    return;
  }

  if (!initial) {
    debounce = true;
    debounceTimer = setTimeout(() => {
      debounce = false;
    }, 200);

    worker = new Worker('sheet-worker.js');
  }

  if (initial) {
    new FormData(spriteImport).forEach((value, key) => (settings[key] = parseInt(value)));

    const imageElm = new Image();

    imageElm.addEventListener('load', () => {
      if (imageElm.width === 0 || imageElm.height === 0) {
        alert('Invalid image!');
        return;
      }

      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');

      tempCanvas.width = imageElm.width - settings['offset-x'] - settings['offset-neg-x'];
      tempCanvas.height = imageElm.height - settings['offset-y'] - settings['offset-neg-y'];

      tempCtx.drawImage(imageElm,
        settings['offset-x'],
        settings['offset-y'],
        imageElm.width - settings['offset-x'] - settings['offset-neg-x'],
        imageElm.height - settings['offset-y'] - settings['offset-neg-y'],
        0,
        0,
        tempCanvas.width,
        tempCanvas.height
      );

      URL.revokeObjectURL(imageElm.src);

      imageName = pendingFile.name;
      pendingFile = null;

      const xLength = Math.ceil(tempCanvas.width / (settings['sprite-x'] + settings['padding-x']));
      const yLength = Math.ceil(tempCanvas.height / (settings['sprite-y'] + settings['padding-y']));

      dataCanvas.width = xLength * settings['sprite-x'];
      dataCanvas.height = yLength * settings['sprite-y'];

      for (let y = 0; y < yLength; y++) {
        for (let x = 0; x < xLength; x++) {
          dataCtx.drawImage(tempCanvas,
            (x * settings['sprite-x']) + (x * settings['padding-x']),
            (y * settings['sprite-y']) + (y * settings['padding-y']),
            settings['sprite-x'],
            settings['sprite-y'],
            x * settings['sprite-x'],
            y * settings['sprite-y'],
            settings['sprite-x'],
            settings['sprite-y']
          );
        }
      }

      dropArea.classList.add('has-image');

      document.getElementById('download').removeAttribute('disabled');

      spriteSettings.querySelector('[name=sprite-x]').value = settings['sprite-x'];
      spriteSettings.querySelector('[name=sprite-y]').value = settings['sprite-y'];
      spriteSettings.querySelector('[name=padding-x]').value = settings['padding-x'];
      spriteSettings.querySelector('[name=padding-y]').value = settings['padding-y'];

      hideModal();

      generateSheet();
    });

    imageElm.src = URL.createObjectURL(pendingFile);

    if (activeCanvas) {
      resetCanvas();
    }
  } else {
    new FormData(spriteSettings).forEach((value, key) => (settings[key] = value.startsWith('#') ? value : parseInt(value)));

    settings.xLength = Math.ceil(dataCanvas.width / settings['sprite-x']);
    settings.yLength = Math.ceil(dataCanvas.height / settings['sprite-y']);

    const targetWidth = dataCanvas.width + (settings.xLength * settings['padding-x']) - settings['padding-x'] + (settings['buffer-x'] * 2);
    const targetHeight = dataCanvas.height + (settings.yLength * settings['padding-y']) - settings['padding-y'] + (settings['buffer-y'] * 2);

    maxScale = Math.floor(Math.sqrt(Math.max(targetWidth, targetHeight)));

    dataCanvas.toBlob(blob => {
      const offscreenCanvas = new OffscreenCanvas(targetWidth, targetHeight);

      worker.postMessage({msg: 'init', canvas: offscreenCanvas, settings: settings, sourceData: blob}, [offscreenCanvas]);

      worker.addEventListener('message', event => {
        if (event.data.msg === 'render') {
          if (event.data.bitmap.width === 0 && event.data.bitmap.height === 0) {
            generateSheet();
          } else {
            targetCanvas.width = targetWidth;
            targetCanvas.height = targetHeight;

            targetCtx.transferFromImageBitmap(event.data.bitmap);

            if (!activeCanvas) {
              activateCanvas();
            }

            dropArea.classList.remove('loading');
          }
        }
      });
    });
  }
}

function activateCanvas() {
  activeCanvas = true;

  document.addEventListener('pointermove', event => {
    if (dragging) {
      position.x = position.x + ((event.clientX - lastPosition.x) / scale);
      position.y = position.y + ((event.clientY - lastPosition.y) / scale);

      lastPosition.x = event.clientX;
      lastPosition.y = event.clientY;

      transformCanvas();
    }
  }, {
    passive: true
  });

  dropArea.addEventListener('wheel', event => {
    event.preventDefault();

    scale += event.deltaY * (-.0005 * scale);
    scale = Math.min(Math.max(.1, scale), maxScale);

    if (event.deltaY < 0) {
      position.x = position.x;
      position.y = position.y;
    }

    transformCanvas();
  }, {
    passive: false
  });

  dropArea.addEventListener('dblclick', event => {
    event.preventDefault();
    resetCanvas();
  });

  dropArea.addEventListener('pointerdown', event => {
    if (event.target.closest('#drop-area') && event.buttons !== 2) {
      dragging = true;
      lastPosition.x = event.clientX;
      lastPosition.y = event.clientY;
    }
  });

  document.addEventListener('pointerup', event => dragging = false);

  spriteSettings.addEventListener('change', () => generateSheet());
}

dropArea.addEventListener('click', () => {
  if (!dropArea.classList.contains('has-image')) {
    input.click();
  }
});

function resetCanvas() {
  position.x = 0;
  position.y = 0;
  lastPosition.x = 0;
  lastPosition.y = 0;
  scale = 1;

  transformCanvas();
}

function transformCanvas() {
  targetCanvas.style.transform = 'scale(' + scale + ') translate(' + position.x + 'px, ' + position.y + 'px)';
}

input.addEventListener('change', event => {
  const file = event.target.files[0];

  if (file) {
    if (acceptedTypes.includes(file.type)) {
      pendingFile = file;

      showModal();
    } else {
      alert('"' + file.name + '" seems to be of the type "' + file.type + '", which is not supported!');
    }
  }
});

document.addEventListener('drop', event => {
  event.preventDefault();
  const file = event.dataTransfer.files[0];

  if (file) {
    if (acceptedTypes.includes(file.type)) {
      pendingFile = file;

      showModal();
    } else {
      alert('"' + file.name + '" seems to be of the type "' + file.type + '", which is not supported!');
    }
  }
});

spriteImport.addEventListener('submit', event => {
  event.preventDefault();
  generateSheet(true);
});

document.getElementById('upload').addEventListener('click', () => input.click());
document.getElementById('download').addEventListener('click', () => {
  const link = document.createElement('a');

  link.download = imageName;
  link.href = document.getElementById('target').toDataURL();

  link.click();
});

document.getElementById('toggle-color').addEventListener('change', event => {
  spriteSettings.querySelector('[name=padding-color]').toggleAttribute('disabled', !event.target.checked);
});

document.addEventListener('dragover', event => event.preventDefault());

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    pendingFile = null;
    hideModal();
  }
});

document.addEventListener('click', event => {
  if (event.target.classList.contains('increment')) {
    event.target.closest('.number-input').querySelector('input').stepUp();

    if (event.target.closest('#sprite-settings')) {
      spriteSettings.dispatchEvent(new Event('change'));
    }
  } else if (event.target.classList.contains('decrement')) {
    event.target.closest('.number-input').querySelector('input').stepDown();

    if (event.target.closest('#sprite-settings')) {
      spriteSettings.dispatchEvent(new Event('change'));
    }
  }
});

spriteSettings.reset();
document.getElementById('download').setAttribute('disabled', '');
spriteSettings.querySelector('[name=padding-color]').setAttribute('disabled', '');
spriteImport.reset();
