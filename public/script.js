
        document.getElementById('cadastroForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('message');
            messageEl.classList.add('hidden');

            const formData = {
                fullName: document.getElementById('fullName').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                password: document.getElementById('password').value
            };

            // Client-side validation
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                messageEl.textContent = 'E-mail inválido.';
                messageEl.classList.remove('hidden');
                return;
            }
            if (!/^\(\d{2}\)\s\d{5}-\d{4}$/.test(formData.phone)) {
                messageEl.textContent = 'Telefone inválido. Use o formato (DD) 99999-9999.';
                messageEl.classList.remove('hidden');
                return;
            }
            if (formData.password.length < 6) {
                messageEl.textContent = 'A senha deve ter no mínimo 6 caracteres.';
                messageEl.classList.remove('hidden');
                return;
            }

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const result = await response.json();
                if (response.ok) {
                    messageEl.textContent = result.message;
                    messageEl.classList.remove('hidden', 'text-red-500');
                    messageEl.classList.add('text-green-500');
                    document.getElementById('cadastroForm').reset();
                } else {
                    messageEl.textContent = result.message;
                    messageEl.classList.remove('hidden');
                }
            } catch (error) {
                messageEl.textContent = 'Erro ao conectar com o servidor.';
                messageEl.classList.remove('hidden');
            }
        });

        // Phone number formatting
        document.getElementById('phone').addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            if (value.length > 2) {
                value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
            }
            if (value.length > 9) {
                value = `${value.slice(0, 10)}-${value.slice(10)}`;
            }
            e.target.value = value;
        });
