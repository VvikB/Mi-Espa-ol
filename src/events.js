/* New restoration module: educational text never becomes JavaScript source. */
function handleFormAction(task, action) {
  const input = task.querySelector('input'), feedback = task.querySelector('.cell-feedback');
  if (action === 'reveal') {
    task.dataset.hintUsed = 'yes';
    feedback.textContent = 'Подсказка: ' + task.dataset.expected;
    return;
  }
  if (input.disabled) return;
  if (task.dataset.hintUsed === 'yes') {
    feedback.textContent = 'Ответ был открыт. Для самостоятельной попытки заново откройте таблицу.';
    return;
  }
  verifyTableCell(task.dataset.cellId, task.dataset.expected, input);
}
document.addEventListener('click', event => {
  const audio = event.target.closest('[data-speech]');
  if (audio) { speak(audio.dataset.speech); return; }
  const control = event.target.closest('[data-form-action]');
  if (control) handleFormAction(control.closest('.form-task'), control.dataset.formAction);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.target.matches('.form-task input')) {
    event.preventDefault(); handleFormAction(event.target.closest('.form-task'), 'check');
  }
});
