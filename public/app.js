const form = document.getElementById('form');
const authorInput = document.getElementById('author');
const messageInput = document.getElementById('message');
const list = document.getElementById('entries');

async function load() {
  const res = await fetch('/api/entries');
  const entries = await res.json();
  list.replaceChildren();
  if (!entries.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No entries yet — be the first to sign!';
    list.append(li);
    return;
  }
  for (const entry of entries) {
    const li = document.createElement('li');

    const head = document.createElement('div');
    head.className = 'head';
    const name = document.createElement('strong');
    name.textContent = entry.author;
    const time = document.createElement('time');
    time.textContent = new Date(entry.created_at).toLocaleString();
    const del = document.createElement('button');
    del.className = 'delete';
    del.textContent = 'Delete';
    del.addEventListener('click', () => remove(entry.id));
    head.append(name, time, del);

    const message = document.createElement('p');
    message.textContent = entry.message;

    li.append(head, message);
    list.append(li);
  }
}

async function remove(id) {
  await fetch('/api/entries/' + id, { method: 'DELETE' });
  load();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const res = await fetch('/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: authorInput.value, message: messageInput.value }),
  });
  if (res.ok) {
    form.reset();
    load();
  } else {
    const data = await res.json().catch(() => ({}));
    alert(data.error || 'Could not save your entry.');
  }
});

load();
