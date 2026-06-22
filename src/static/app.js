document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset select
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activity = name;

        const spotsLeft = details.max_participants - details.participants.length;

        // build participants list HTML
        const participantsHtml = (details.participants && details.participants.length > 0)
          ? details.participants.map((p) => {
              const local = p.split('@')[0];
              const initials = local
                .split(/[\.\-_]/)
                .map(s => s[0] || '')
                .join('')
                .slice(0,2)
                .toUpperCase();
              return `<li class="participant-item" data-email="${p}"><span class="participant-avatar">${initials}</span><span class="participant-email">${p}</span><button class="participant-remove" title="Cancelar inscrição" aria-label="Remover ${p}">✕</button></li>`;
            }).join('')
          : '<li class="empty">Nenhum participante inscrito</li>';

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <h5>Participantes</h5>
            <ul class="participants-list">
              ${participantsHtml}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();

        // Update the participants list and availability for the activity
        const activityCards = Array.from(activitiesList.querySelectorAll('.activity-card'));
        const targetCard = activityCards.find(c => c.dataset.activity === activity);
        if (targetCard) {
          const ul = targetCard.querySelector('.participants-list');
          if (ul) {
            // rebuild participants list from server response
            const participants = result.participants || [];
            if (participants.length === 0) {
              ul.innerHTML = '<li class="empty">Nenhum participante inscrito</li>';
            } else {
              ul.innerHTML = participants.map(p => {
                const local = p.split('@')[0];
                const initials = local.split(/[\.\-_]/).map(s=>s[0]||'').join('').slice(0,2).toUpperCase();
                return `<li class="participant-item" data-email="${p}"><span class="participant-avatar">${initials}</span><span class="participant-email">${p}</span><button class="participant-remove" title="Cancelar inscrição" aria-label="Remover ${p}">✕</button></li>`;
              }).join('');
            }

            // update availability text
            const availabilityEl = targetCard.querySelector('.availability');
            if (availabilityEl) {
              const max = result.max_participants || 0;
              const spots = Math.max(0, max - participants.length);
              availabilityEl.innerHTML = `<strong>Availability:</strong> ${spots} spots left`;
            }
          }
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Delegated click handler para remover participante
  activitiesList.addEventListener("click", async (e) => {
    const btn = e.target.closest && e.target.closest(".participant-remove");
    if (!btn) return;

    const li = btn.closest(".participant-item");
    if (!li) return;

    const email = li.dataset.email;
    const activityCard = li.closest(".activity-card");
    const activityName = activityCard && activityCard.dataset.activity;

    if (!activityName || !email) return;

    // confirmar remoção
    if (!confirm(`Remover ${email} da atividade "${activityName}"?`)) return;

    try {
      const res = await fetch(
        `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (res.ok) {
        // rebuild participants list from server response
        const ul = activityCard.querySelector('.participants-list');
        const participants = data.participants || [];
        if (ul) {
          if (participants.length === 0) {
            ul.innerHTML = '<li class="empty">Nenhum participante inscrito</li>';
          } else {
            ul.innerHTML = participants.map(p => {
              const local = p.split('@')[0];
              const initials = local.split(/[\.\-_]/).map(s=>s[0]||'').join('').slice(0,2).toUpperCase();
              return `<li class="participant-item" data-email="${p}"><span class="participant-avatar">${initials}</span><span class="participant-email">${p}</span><button class="participant-remove" title="Cancelar inscrição" aria-label="Remover ${p}">✕</button></li>`;
            }).join('');
          }

          // update availability
          const availabilityEl = activityCard.querySelector('.availability');
          if (availabilityEl) {
            const max = data.max_participants || 0;
            const spots = Math.max(0, max - participants.length);
            availabilityEl.innerHTML = `<strong>Availability:</strong> ${spots} spots left`;
          }
        }

        // optional short feedback
        alert(data.message || "Removido com sucesso");
      } else {
        alert(data.detail || data.message || "Falha ao remover participante");
      }
    } catch (err) {
      console.error("Error removing participant:", err);
      alert("Erro de rede ao remover participante");
    }
  });

  // Initialize app
  fetchActivities();
});
