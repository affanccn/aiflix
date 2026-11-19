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
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const PROFILE_PICTURES = [
    '/public/img/user/user-1.jpg',
    '/public/img/user/userman1.jpg',
    '/public/img/user/userwoman1.jpg',
    '/public/img/user/userwoman2.jpg'
];

function getTurkishAuthErrorMessage(code) {
    switch (code) {
        case 'auth/email-already-in-use':
            return 'Bu e-posta adresi zaten kullanımda.';
        case 'auth/invalid-email':
            return 'Geçersiz e-posta formatı.';
        case 'auth/weak-password':
            return 'Şifre çok zayıf, lütfen en az 6 karakter kullanın.';
        case 'auth/user-not-found':
            return 'Bu e-posta ile kayıtlı bir kullanıcı bulunamadı.';
        case 'auth/wrong-password':
            return 'Girdiğiniz şifre hatalı.';
        case 'auth/invalid-credential':
            return 'E-posta veya şifre bilgisi hatalı.';
        case 'auth/too-many-requests':
            return 'Çok fazla başarısız deneme yapıldı. Lütfen biraz sonra tekrar deneyin.';
        default:
            return 'Giriş/Kayıt sırasında bir hata oluştu.';
    }
}

// Kullanıcı kaydı
export async function registerUser(email, password, username, selectedProfilePicture) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const photoURL = selectedProfilePicture || PROFILE_PICTURES[0];

        await updateProfile(user, {
            displayName: username,
            photoURL: photoURL
        });

        // Firestore kullanıcı dokümanı
        try {
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
        } catch (dbErr) {
            console.warn("Firestore user sync uyarısı:", dbErr.message);
        }

        localStorage.setItem('loggedInUser', username);
        localStorage.setItem('userProfilePicture', photoURL);

        return { success: true, message: "Kayıt başarılı!" };
    } catch (error) {
        console.error("Kayıt hatası:", error);
        return { 
            success: false, 
            message: getTurkishAuthErrorMessage(error.code) || error.message
        };
    }
}

// Kullanıcı girişi
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        let username = user.displayName;
        let photoURL = user.photoURL || PROFILE_PICTURES[0];

        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                const userData = userDoc.data();
                username = userData.username || username;
                photoURL = userData.photoURL || photoURL;
            }
        } catch (dbErr) {
            console.warn("Firestore profil çekme uyarısı:", dbErr.message);
        }

        const displayName = username || (email ? email.split('@')[0] : 'Kullanıcı');
        localStorage.setItem('loggedInUser', displayName);
        localStorage.setItem('userProfilePicture', photoURL);

        return { success: true, message: "Giriş başarılı!" };
    } catch (error) {
        console.error("Giriş hatası:", error);
        return { 
            success: false, 
            message: getTurkishAuthErrorMessage(error.code) || error.message
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
