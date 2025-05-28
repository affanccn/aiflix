import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    setDoc,
    getDoc,
    collection 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const PROFILE_PICTURES = [
    '/public/img/user/user-1.jpg',
    '/public/img/user/userman1.jpg',
    '/public/img/user/userwoman1.jpg',
    '/public/img/user/userwoman2.jpg'
];

// Kullanıcı kaydı
export async function registerUser(email, password, username, selectedProfilePicture) {
    try {
        // Firebase Authentication'da kullanıcı oluştur
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Seçilen profil fotoğrafını veya varsayılan olarak ilk fotoğrafı kullan
        const photoURL = selectedProfilePicture || PROFILE_PICTURES[0];

        // Kullanıcı profilini güncelle
        await updateProfile(user, {
            displayName: username,
            photoURL: photoURL
        });

        // Firestore'a kullanıcı verilerini kaydet
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
            uid: user.uid,
            email: email,
            username: username,
            photoURL: photoURL,
            createdAt: new Date().toISOString(),
            favorites: [],
            watchlist: [],
            reviews: []
        });

        localStorage.setItem('loggedInUser', username);
        localStorage.setItem('userProfilePicture', photoURL);

        return { success: true, message: "Kayıt başarılı!" };
    } catch (error) {
        console.error("Kayıt hatası:", error);
        return { 
            success: false, 
            message: error.message || "Kayıt sırasında bir hata oluştu."
        };
    }
}

// Kullanıcı girişi
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Firestore'dan kullanıcı verilerini al
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            localStorage.setItem('loggedInUser', userData.username);
            localStorage.setItem('userProfilePicture', userData.photoURL);
        } else {
            localStorage.setItem('loggedInUser', user.displayName);
            localStorage.setItem('userProfilePicture', user.photoURL);
        }

        return { success: true, message: "Giriş başarılı!" };
    } catch (error) {
        console.error("Giriş hatası:", error);
        return { 
            success: false, 
            message: error.message || "Giriş sırasında bir hata oluştu."
        };
    }
}

// Çıkış yap
export async function logoutUser() {
    try {
        await signOut(auth);
        
        localStorage.removeItem('loggedInUser');
        localStorage.removeItem('userProfilePicture');

        return { success: true, message: "Çıkış başarılı!" };
    } catch (error) {
        console.error("Çıkış hatası:", error);
        return { 
            success: false, 
            message: error.message || "Çıkış sırasında bir hata oluştu."
        };
    }
} 