const dropArea = document.getElementById('drop-area');
const input = dropArea.querySelector('input');
const targetCanvas = document.getElementById('target');
const spriteSettings = document.getElementById('sprite-settings');
const spriteImport = document.getElementById('sprite-import');

let activeCanvas = false;

let imageName;
let pendingFile;
let dragging = false;
let scale = 1;

const lastPosition = {
  x: 0,
  y: 0
};

const position = {
  x: 0,
  y: 0
};

function showModal() {
  spriteImport.querySelector('[name=sprite-x]').value = spriteSettings.querySelector('[name=sprite-x]').value;
  spriteImport.querySelector('[name=sprite-y]').value = spriteSettings.querySelector('[name=sprite-y]').value;
  spriteImport.querySelector('[name=padding-x]').value = spriteSettings.querySelector('[name=padding-x]').value;
  spriteImport.querySelector('[name=padding-y]').value = spriteSettings.querySelector('[name=padding-y]').value;

  document.getElementById('modal').classList.add('show');
}

function hideModal() {
  document.getElementById('modal').classList.remove('show');
}

function generateSheet(initial = false) {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const settings = {};

  if (initial) {
    new FormData(spriteImport).forEach((value, key) => (settings[key] = parseInt(value)));

    const tempCanvas = document.getElementById('temp');
    const tempCtx = tempCanvas.getContext('2d');
    const imageElm = new Image();

    imageElm.addEventListener('load', () => {
      tempCanvas.width = imageElm.width - settings['offset-x'] - settings['offset-neg-x'];
      tempCanvas.height = imageElm.height - settings['offset-y'] - settings['offset-neg-y'];
      tempCtx.drawImage(imageElm, settings['offset-x'], settings['offset-y'], imageElm.width - settings['offset-x'] - settings['offset-neg-x'], imageElm.height - settings['offset-y'] - settings['offset-neg-y'], 0, 0, tempCanvas.width, tempCanvas.height);
      URL.revokeObjectURL(imageElm.src);

      imageName = pendingFile.name;
      pendingFile = null;

      const xLength = Math.ceil(tempCanvas.width / (settings['sprite-x'] + settings['padding-x']));
      const yLength = Math.ceil(tempCanvas.height / (settings['sprite-y'] + settings['padding-y']));

      canvas.width = xLength * settings['sprite-x'];
      canvas.height = yLength * settings['sprite-y'];

      for (let y = 0; y < yLength; y++) {
        for (let x = 0; x < xLength; x++) {
          const data = tempCtx.getImageData((x * settings['sprite-x']) + (x * settings['padding-x']), (y * settings['sprite-y']) + (y * settings['padding-y']), settings['sprite-x'], settings['sprite-y']);

          ctx.putImageData(data, x * settings['sprite-x'], y * settings['sprite-y']);
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
      scale = 1
      lastPosition.x = 0;
      lastPosition.y = 0;
      position.x = 0;
      position.y = 0;

      transformCanvas();
    }
  } else {
    new FormData(spriteSettings).forEach((value, key) => (settings[key] = value.startsWith('#') ? value : parseInt(value)));

    const targetCtx = targetCanvas.getContext('2d');
    const xLength = Math.ceil(canvas.width / settings['sprite-x']);
    const yLength = Math.ceil(canvas.height / settings['sprite-y']);

    targetCanvas.width = canvas.width + (xLength * settings['padding-x']) - settings['padding-x'] + (settings['buffer-x'] * 2);
    targetCanvas.height = canvas.height + (yLength * settings['padding-y']) - settings['padding-y'] + (settings['buffer-y'] * 2);

    targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    targetCtx.fillStyle = settings['padding-color'] + settings['padding-color-alpha'].toString(16).padStart(2, '0');
    targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

    for (let y = 0; y < yLength; y++) {
      for (let x = 0; x < xLength; x++) {
          targetCtx.drawImage(canvas,
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

    if (!activeCanvas) {
      activateCanvas();
    }
  }
}

function activateCanvas() {
  activeCanvas = true;

  dropArea.addEventListener('mousemove', event => {
    event.preventDefault();

    if (dragging) {
      position.x = position.x + ((event.clientX - lastPosition.x) / scale);
      position.y = position.y + ((event.clientY - lastPosition.y) / scale);

      lastPosition.x = event.clientX;
      lastPosition.y = event.clientY;

      transformCanvas();
    }
  });

  dropArea.addEventListener('wheel', event => {
    event.preventDefault();

    scale += event.deltaY * -0.001;
    scale = Math.min(Math.max(.125, scale), 4);

    transformCanvas();
  });

  document.addEventListener('mousedown', event => {
    if (event.target.closest('#drop-area')) {
      dragging = true;
      lastPosition.x = event.clientX;
      lastPosition.y = event.clientY;
    }
  });

  document.addEventListener('mouseup', event => dragging = false);

  spriteSettings.addEventListener('change', () => generateSheet());
}

dropArea.addEventListener('click', () => {
  if (!dropArea.classList.contains('has-image')) {
    input.click();
  }
});

function transformCanvas() {
  targetCanvas.style.transform = 'scale(' + scale + ') translate(' + position.x + 'px, ' + position.y + 'px)';
}

input.addEventListener('change', event => {
  const file = event.target.files[0];

  if (file) {
    if (file.type.startsWith('image/')) {
      pendingFile = file;

      showModal();
    } else {
      alert('"' + file.name + '" does not appear to be an image!');
    }
  }
});

document.addEventListener('drop', event => {
  event.preventDefault();
  const file = event.dataTransfer.files[0];

  if (file) {
    if (file.type.startsWith('image/')) {
      pendingFile = file;

      showModal();
    } else {
      alert('"' + file.name + '" does not appear to be an image!');
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

document.getElementById('download').setAttribute('disabled', '');
