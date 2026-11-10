<?php
session_start();
if (!empty($_SESSION['tamasa_admin'])) {
    header('Location: index.html');
    exit;
}
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#17191B">
<title>Вход | TAMASA MEBEL</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="editor.css">
</head>
<body class="tamasa-login">
<div class="grain" aria-hidden="true"></div>
<main class="login-shell">
  <a class="brand login-brand" href="index.html"><span class="brand-logo"><img src="assets/tamasa-mark.png" alt=""></span><span class="brand-name"><b>TAMASA</b><small>M E B E L</small></span></a>
  <section class="login-card">
    <span class="login-kicker">TAMASA HOME STYLE · PRIVATE ACCESS</span>
    <h1>Вход <em>для команды.</em></h1>
    <p>Авторизуйтесь, чтобы управлять содержимым сайта.</p>
    <form id="loginForm">
      <label for="username">Логин</label><input id="username" name="username" autocomplete="username" required>
      <label for="password">Пароль</label><input id="password" name="password" type="password" autocomplete="current-password" required>
      <p class="login-error" id="loginError" role="alert"></p>
      <button class="btn btn-orange" type="submit">Войти <span>↗</span></button>
    </form>
    <a class="login-back" href="index.html">← Вернуться на сайт</a>
  </section>
  <span class="login-foot">ЗАЩИЩЁННЫЙ ДОСТУП · TAMASA MEBEL</span>
</main>
<script>
document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button');
  const error = document.getElementById('loginError');
  button.disabled = true; error.textContent = '';
  try {
    const response = await fetch('api.php?action=login', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({username: form.username.value.trim(), password: form.password.value})
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Не удалось войти');
    location.href = 'index.html';
  } catch (e) { error.textContent = e.message; button.disabled = false; }
});
</script>
</body></html>