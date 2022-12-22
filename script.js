const dropArea = document.getElementById('drop-area');
const input = dropArea.querySelector('input');

let imageName;
let pendingFile;

function showModal() {
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
    new FormData(document.getElementById('sprite-import')).forEach((value, key) => (settings[key] = parseInt(value)));

    const tempCanvas = document.getElementById('temp');
    const tempCtx = tempCanvas.getContext('2d');

    const imageElm = new Image();

    imageElm.onload = function() {
      tempCanvas.width = this.width - settings['offset-x'] - settings['offset-neg-x'];
      tempCanvas.height = this.height - settings['offset-y'] - settings['offset-neg-y'];
      tempCtx.drawImage(this, settings['offset-x'], settings['offset-y'], this.width - settings['offset-x'] - settings['offset-neg-x'], this.height - settings['offset-y'] - settings['offset-neg-y'], 0, 0, tempCanvas.width, tempCanvas.height);
      URL.revokeObjectURL(this.src);

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

      tempCanvas.remove();

      dropArea.classList.add('has-image');
      dropArea.innerHTML = '<canvas id="display"></canvas>';

      document.getElementById('download').removeAttribute('disabled');
      document.getElementById('generate').removeAttribute('disabled');

      hideModal();

      generateSheet(false);
    };

    imageElm.src = URL.createObjectURL(pendingFile);
  } else {
    new FormData(document.getElementById('sprite-settings')).forEach((value, key) => (settings[key] = value.startsWith('#') ? value : parseInt(value)));

    const targetCanvas = document.getElementById('display');
    const targetCtx = targetCanvas.getContext('2d');

    const xLength = canvas.width / settings['sprite-x'];
    const yLength = canvas.height / settings['sprite-y'];

    targetCanvas.width = canvas.width + (xLength * settings['padding-x']) - settings['padding-x'] + (settings['buffer-x'] * 2);
    targetCanvas.height = canvas.height + (yLength * settings['padding-y']) - settings['padding-y'] + (settings['buffer-y'] * 2);

    targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    targetCtx.fillStyle = settings['padding-color'] + settings['padding-color-alpha'].toString(16).padStart(2, '0');
    targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

    for (let y = 0; y < yLength; y++) {
      for (let x = 0; x < xLength; x++) {
        const data = ctx.getImageData((x * settings['sprite-x']), (y * settings['sprite-y']), settings['sprite-x'], settings['sprite-y']);

        targetCtx.putImageData(data, (x * settings['sprite-x']) + (x * settings['padding-x']) + settings['buffer-x'], (y * settings['sprite-y']) + (y * settings['padding-y']) + settings['buffer-y']);
      }
    }
  }
}

dropArea.addEventListener('click', () => {
  if (!dropArea.classList.contains('has-image')) {
    input.click();
  }
});

input.addEventListener('change', event => {
  const file = event.target.files[0];

  if (file) {
    pendingFile = file;

    showModal();
  }
});

document.getElementById('sprite-import').addEventListener('submit', event => {
  event.preventDefault();

  document.getElementById('data-container').innerHTML = '<canvas id="canvas"></canvas><canvas id="temp"></canvas>';

  generateSheet(true);
});

document.getElementById('sprite-settings').addEventListener('submit', event => {
  event.preventDefault();

  generateSheet(false);
});

document.getElementById('upload').addEventListener('click', () => {
  input.click();
});

document.getElementById('download').addEventListener('click', () => {
  const link = document.createElement('a');

  link.download = imageName;
  link.href = document.getElementById('image-content').src;

  link.click();
});

document.addEventListener('drop', event => {
  event.preventDefault();
  const file = event.dataTransfer.files[0];

  if (file) {
    pendingFile = file;

    showModal();
  }
});

document.addEventListener('dragover', event => {
  event.preventDefault();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    pendingFile = null;
    hideModal();
  }
});

document.addEventListener('click', event => {
  if (event.target.classList.contains('increment')) {
    event.target.closest('.number-input').querySelector('input').stepUp();
  } else if (event.target.classList.contains('decrement')) {
    event.target.closest('.number-input').querySelector('input').stepDown();
  }
});

document.getElementById('generate').setAttribute('disabled', '');
document.getElementById('download').setAttribute('disabled', '');