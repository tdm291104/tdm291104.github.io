const search = document.getElementById('search');
const topicFilter = document.getElementById('topic-filter');
const questions = [...document.querySelectorAll('.question-item')];
const sections = [...document.querySelectorAll('.question-section')];
const tocLinks = [...document.querySelectorAll('.bank-toc a')];
const languageLinks = new Map([...document.querySelectorAll('[data-language-link]')].map(link => [link, link.getAttribute('href')]));
const units = document.getElementById('main').dataset;

function normalize(text) {
  return text.normalize('NFKC').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

const searchText = new Map(questions.map(question => [question, normalize(question.textContent)]));

function filterQuestions() {
  const words = normalize(search.value).trim().split(/\s+/).filter(Boolean);
  let count = 0;
  for (const question of questions) {
    question.hidden = (topicFilter.value !== 'all' && question.dataset.topic !== topicFilter.value)
      || !words.every(word => searchText.get(question).includes(word));
    if (!question.hidden) count++;
  }
  for (const section of sections) {
    section.hidden = !questions.some(question => question.dataset.topic === section.id && !question.hidden);
  }
  for (const link of tocLinks) {
    link.parentElement.hidden = document.getElementById(link.hash.slice(1)).hidden;
  }
  const sectionCount = sections.filter(section => !section.hidden).length;
  const entryUnit = count === 1 ? (units.entrySingular || units.entryUnit) : units.entryUnit;
  const sectionUnit = sectionCount === 1 ? (units.sectionSingular || units.sectionUnit) : units.sectionUnit;
  document.getElementById('result-count').textContent = `${count} ${entryUnit} · ${sectionCount} ${sectionUnit}`;
  document.getElementById('empty-state').hidden = count !== 0;
}

search.addEventListener('input', filterQuestions);
topicFilter.addEventListener('change', filterQuestions);
document.querySelector('.search-form').addEventListener('submit', event => event.preventDefault());
document.getElementById('reset-search').addEventListener('click', () => {
  search.value = '';
  topicFilter.value = 'all';
  filterQuestions();
  search.focus();
});

function revealLinkedQuestion() {
  const target = document.getElementById(location.hash.slice(1));
  if (!target || !target.classList.contains('question-item')) return;
  search.value = '';
  topicFilter.value = 'all';
  filterQuestions();
  target.open = true;
  target.scrollIntoView({ block: 'start' });
}

function updateLanguageLinks(hash = location.hash) {
  for (const [link, file] of languageLinks) link.setAttribute('href', file + hash);
}

questions.forEach(question => question.addEventListener('toggle', () => {
  if (question.open) updateLanguageLinks('#' + question.id);
}));
window.addEventListener('hashchange', () => {
  revealLinkedQuestion();
  updateLanguageLinks();
});
revealLinkedQuestion();
updateLanguageLinks();
