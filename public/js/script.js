document.addEventListener("DOMContentLoaded", function () {
    const username = localStorage.getItem("username");
    if (username) {
        document.getElementById("username")?.textContent = username;
    }
});

// Kayıt Ol Fonksiyonu
function register() {
    let username = document.getElementById("registerUsername").value;
    let password = document.getElementById("registerPassword").value;

    if (username === "" || password === "") {
        alert("Lütfen tüm alanları doldurun.");
        return;
    }

    // Kullanıcıyı LocalStorage'a kaydet
    localStorage.setItem("username", username);
    localStorage.setItem("password", password);

    alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
    window.location.href = "giris.html"; // Giriş sayfasına yönlendir
}

// Giriş Yap Fonksiyonu
function login() {
    console.log("Giriş yap fonksiyonu çalıştı!");

    let username = document.getElementById("loginUsername").value;
    let password = document.getElementById("loginPassword").value;

    // Kullanıcı adı ve şifreyi konsola yazdıralım
    console.log("Kullanıcı Adı: " + username);
    console.log("Şifre: " + password);

    let storedUsername = localStorage.getItem("username");
    let storedPassword = localStorage.getItem("password");

    // Eğer localStorage'da herhangi bir değer yoksa
    if (!storedUsername || !storedPassword) {
        alert("Kullanıcı adı veya şifre bulunamadı.");
        return;
    }

    // Kullanıcı adı ve şifre doğrulaması
    if (username === storedUsername && password === storedPassword) {
        console.log("Giriş başarılı!"); // Başarılı giriş mesajı
        localStorage.setItem("isLoggedIn", "true");
        window.location.href = "index.html"; // Anasayfaya yönlendir
    } else {
        console.log("Hatalı kullanıcı adı veya şifre.");
        alert("Hatalı kullanıcı adı veya şifre.");
    }
}


// Çıkış Yap Fonksiyonu
document.getElementById("logoutBtn")?.addEventListener("click", function () {
    localStorage.removeItem("isLoggedIn");
    window.location.href = "giris.html";
});
