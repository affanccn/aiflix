// AiFlix - Global Script

document.addEventListener("DOMContentLoaded", function () {
    // Topbar Profil Durumunu Güncelle (localStorage ve Firebase ile senkron)
    updateNavbarUser();

    // Topbar Arama Motoru İşlevselliği
    const searchIcon = document.getElementById("searchIcon");
    const topSearchInput = document.getElementById("topSearchInput");

    if (searchIcon && topSearchInput) {
        searchIcon.addEventListener("click", function (e) {
            if (topSearchInput.value.trim()) {
                e.preventDefault();
                executeGlobalSearch(topSearchInput.value.trim());
            } else {
                topSearchInput.focus();
            }
        });
    }

    if (topSearchInput) {
        topSearchInput.addEventListener("keypress", function (e) {
            if (e.key === "Enter" && this.value.trim()) {
                e.preventDefault();
                executeGlobalSearch(this.value.trim());
            }
        });
    }
});

// Global Arama Yönlendirmesi
function executeGlobalSearch(query) {
    if (!query) return;
    window.location.href = `/cinebot?movie=${encodeURIComponent(query)}`;
}

// Navbar kullanıcı durumu
function updateNavbarUser() {
    const loggedInUser = localStorage.getItem("loggedInUser");
    const userProfilePicture = localStorage.getItem("userProfilePicture");
    const userProfileContainer = document.getElementById("userProfileContainer");
    const authLink = document.getElementById("authLink");

    if (loggedInUser && userProfileContainer) {
        userProfileContainer.innerHTML = `
            <div class="user-avatar-wrap" style="position: relative; display: flex; align-items: center; cursor: pointer;" title="${loggedInUser}">
                <img src="${userProfilePicture || '/public/img/user/user-1.jpg'}" alt="${loggedInUser}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid #ff6b08;">
            </div>
        `;
        if (authLink) authLink.style.display = "none";

        // Tıklandığında profil / çıkış menüsü aç
        userProfileContainer.onclick = function (e) {
            e.stopPropagation();
            toggleUserDropdown();
        };
    } else if (userProfileContainer) {
        userProfileContainer.innerHTML = `
            <a href="/auth" style="color: #fff; text-decoration: none; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.1);">
                <i class="fa-solid fa-user" style="font-size: 18px;"></i>
            </a>
        `;
        if (authLink) authLink.style.display = "inline-block";
    }
}

// Kullanıcı Açılır Menüsü
function toggleUserDropdown() {
    let menu = document.getElementById("userNavDropdown");
    if (menu) {
        menu.remove();
        return;
    }

    const container = document.getElementById("userProfileContainer");
    if (!container) return;

    const loggedInUser = localStorage.getItem("loggedInUser") || "Kullanıcı";
    menu = document.createElement("div");
    menu.id = "userNavDropdown";
    menu.style.cssText = `
        position: absolute;
        top: 60px;
        right: 20px;
        background: rgba(18, 24, 43, 0.95);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        padding: 12px;
        min-width: 180px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        z-index: 10000;
        color: #fff;
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;

    menu.innerHTML = `
        <div style="padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: bold; font-size: 0.9rem; color: #ff6b08;">
            👤 ${loggedInUser}
        </div>
        <a href="/filmsozluk" style="color: #fff; text-decoration: none; font-size: 0.85rem; padding: 6px 8px; border-radius: 6px; display: flex; align-items: center; gap: 8px; transition: background 0.2s;">
            <i class="fa-solid fa-comments"></i> Tartışmalarım
        </a>
        <button id="navLogoutBtn" style="background: rgba(235, 30, 30, 0.2); color: #ff6b6b; border: 1px solid rgba(235, 30, 30, 0.3); padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;">
            <i class="fa-solid fa-arrow-right-from-bracket"></i> Çıkış Yap
        </button>
    `;

    document.body.appendChild(menu);

    document.getElementById("navLogoutBtn")?.addEventListener("click", () => {
        localStorage.removeItem("loggedInUser");
        localStorage.removeItem("userProfilePicture");
        window.location.reload();
    });

    document.addEventListener("click", function closeMenu(ev) {
        if (!menu.contains(ev.target) && ev.target !== container) {
            menu.remove();
            document.removeEventListener("click", closeMenu);
        }
    });
}
