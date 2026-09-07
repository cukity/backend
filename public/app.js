const list = document.getElementById('entries');
const form = document.getElementById('form');
const author = document.getElementById('author');
const message = document.getElementById('message');
const errorEl = document.getElementById('error');
const emptyEl = document.getElementById('empty');

function entryEl(e) {
  const li = document.createElement('li');

  const head = document.createElement('div');
  head.className = 'head';

  const name = document.createElement('strong');
  name.textContent = e.author;

  const when = document.createElement('time');
  if (e.created_at) when.textContent = new Date(e.created_at).toLocaleString();

  const del = document.createElement('button');
  del.textContent = 'Delete';
  del.onclick = async () => {
    if (!confirm('Delete this entry?')) return;
    await fetch('/api/entries/' + e.id, { method: 'DELETE' });
    load();
  };

  head.append(name, when, del);

  const p = document.createElement('p');
  p.textContent = e.message;

  li.append(head, p);
  return li;
}

async function load() {
  const res = await fetch('/api/entries');
  const entries = await res.json();
  list.replaceChildren(...entries.map(entryEl));
  emptyEl.hidden = entries.length > 0;
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  errorEl.hidden = true;

  const res = await fetch('/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: author.value, message: message.value }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    errorEl.textContent = data.error || 'Something went wrong.';
    errorEl.hidden = false;
    return;
  }

  form.reset();
  load();
});

load();
