export function openDialog(id) {
  const dialog = document.getElementById(id);
  if (!dialog.open) dialog.showModal();
}

export function bindDialogs() {
  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => document.getElementById(button.dataset.close).close());
  });
  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });
}

let toastTimer;
export function toast(message) {
  const element = document.querySelector('#toast');
  clearTimeout(toastTimer);
  element.textContent = message;
  element.hidden = false;
  toastTimer = setTimeout(() => { element.hidden = true; }, 4000);
}

export function createTextEditor(onSubmit) {
  const form = document.querySelector('#text-editor');
  const input = document.querySelector('#text-input');
  let point;
  const close = () => {
    form.hidden = true;
    point = null;
    document.querySelector('#canvas').focus({ preventScroll: true });
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (point && input.value.trim()) onSubmit(input.value, point);
    close();
  });
  document.querySelector('#text-cancel').addEventListener('click', close);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
  });
  window.visualViewport?.addEventListener('resize', () => {
    if (form.hidden) return;
    const availableHeight = window.visualViewport.height + window.visualViewport.offsetTop;
    form.style.top = `${Math.max(8, Math.min(parseFloat(form.style.top), availableHeight - form.offsetHeight - 8))}px`;
  });
  return {
    open(position) {
      point = { x: position.x, y: position.y };
      form.hidden = false;
      input.value = '';
      form.style.left = `${Math.max(12, Math.min(position.clientX, innerWidth - form.offsetWidth - 12))}px`;
      form.style.top = `${Math.max(12, Math.min(position.clientY, innerHeight - form.offsetHeight - 12))}px`;
      input.focus();
    },
    close,
  };
}
