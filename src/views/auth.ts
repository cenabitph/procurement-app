export function loginPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - Procurement System</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
  </style>
</head>
<body class="flex items-center justify-center min-h-screen">
  <div class="w-full max-w-md">
    <!-- Card -->
    <div class="bg-white shadow-lg">
      <!-- Header -->
      <div class="bg-blue-600 text-white px-8 py-6">
        <h1 class="text-2xl font-bold">Procurement System</h1>
        <p class="text-blue-100 text-sm mt-1">RA 9184 Compliance</p>
      </div>
      
      <!-- Form -->
      <div class="px-8 py-8">
        <form id="loginForm">
          <div class="mb-6">
            <label class="block text-gray-700 font-semibold mb-2">Username</label>
            <input type="text" id="username" name="username" required
              class="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500"
              placeholder="Enter your username">
          </div>
          
          <div class="mb-8">
            <label class="block text-gray-700 font-semibold mb-2">Password</label>
            <input type="password" id="password" name="password" required
              class="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500"
              placeholder="Enter your password">
          </div>

          <div id="errorMsg" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 hidden"></div>

          <button type="submit"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 transition">
            Sign In
          </button>
        </form>

        <div class="mt-6 text-center text-sm text-gray-600">
          <p>Demo credentials:</p>
          <p class="font-mono text-xs mt-2">admin / admin</p>
        </div>
      </div>
    </div>

    <p class="text-white text-center text-sm mt-6">
      Philippine Government Procurement System
    </p>
  </div>

  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const errorMsg = document.getElementById('errorMsg');

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          const data = await response.json();
          errorMsg.textContent = data.error || 'Login failed';
          errorMsg.classList.remove('hidden');
          return;
        }

        const data = await response.json();
        localStorage.setItem('token', data.token);
        window.location.href = '/';
      } catch (err) {
        errorMsg.textContent = 'Network error';
        errorMsg.classList.remove('hidden');
      }
    });
  </script>
</body>
</html>`;
}
