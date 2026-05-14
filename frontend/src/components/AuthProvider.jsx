import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from "firebase/auth";

import {
  auth,
  provider
} from "../firebase";

const AuthContext =
  createContext();

const USERS_KEY =
  "registeredUsers";

const CURRENT_USER_KEY =
  "authUser";

function readJson(key, fallback) {

  try {

    const value =
      localStorage.getItem(key);

    return value
      ? JSON.parse(value)
      : fallback;

  } catch (error) {

    return fallback;
  }
}

function toLocalUser(userData) {

  return {
    id: userData.uid || userData.id || Date.now(),
    displayName:
      userData.displayName ||
      userData.email?.split("@")[0] ||
      "User",
    email: userData.email,
  };
}

function saveLocalUser(userData, password = "") {

  const currentUser =
    toLocalUser(userData);

  const users =
    readJson(
      USERS_KEY,
      []
    );

  const existingUser =
    users.find(
      (savedUser) =>
        savedUser.email === currentUser.email
    );

  const savedUser = {
    ...existingUser,
    ...currentUser,
    password:
      password ||
      existingUser?.password ||
      "",
    updatedAt: new Date().toISOString(),
    createdAt:
      existingUser?.createdAt ||
      new Date().toISOString(),
  };

  const nextUsers =
    existingUser
      ? users.map((user) =>
          user.email === savedUser.email
            ? savedUser
            : user
        )
      : [
          ...users,
          savedUser,
        ];

  localStorage.setItem(
    USERS_KEY,
    JSON.stringify(nextUsers)
  );

  localStorage.setItem(
    CURRENT_USER_KEY,
    JSON.stringify(currentUser)
  );

  return currentUser;
}

function findLocalUser(email, password) {

  const cleanEmail =
    email.trim().toLowerCase();

  const users =
    readJson(
      USERS_KEY,
      []
    );

  return users.find(
    (userData) =>
      userData.email === cleanEmail &&
      userData.password === password
  );
}

export function AuthProvider({
  children
}) {

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        (currentFirebaseUser) => {

          if (currentFirebaseUser) {

            const currentUser =
              saveLocalUser(
                currentFirebaseUser
              );

            setUser(currentUser);

          } else {

            setUser(
              readJson(
                CURRENT_USER_KEY,
                null
              )
            );
          }

          setLoading(false);
        }
      );

    const syncUser =
      () => {

        setUser(
          readJson(
            CURRENT_USER_KEY,
            null
          )
        );
      };

    window.addEventListener(
      "storage",
      syncUser
    );

    return () => {

      unsubscribeAuth();

      window.removeEventListener(
        "storage",
        syncUser
      );
    };

  }, []);

  const signup =
    async ({ name, email, password }) => {

      const cleanName =
        name.trim();

      const cleanEmail =
        email.trim().toLowerCase();

      if (!cleanName) {

        throw new Error(
          "Please enter your full name"
        );
      }

      if (!cleanEmail) {

        throw new Error(
          "Please enter your email"
        );
      }

      if (password.length < 6) {

        throw new Error(
          "Password must be at least 6 characters"
        );
      }

      try {

        const credential =
          await createUserWithEmailAndPassword(
            auth,
            cleanEmail,
            password
          );

        await updateProfile(
          credential.user,
          {
            displayName: cleanName,
          }
        );

        const currentUser =
          saveLocalUser(
            {
              uid: credential.user.uid,
              displayName: cleanName,
              email: cleanEmail,
            },
            password
          );

        setUser(currentUser);

        return;

      } catch (firebaseError) {

        if (
          firebaseError.code ===
          "auth/email-already-in-use"
        ) {

          throw new Error(
            "User already registered"
          );
        }

        const users =
          readJson(
            USERS_KEY,
            []
          );

        const exists =
          users.some(
            (savedUser) =>
              savedUser.email === cleanEmail
          );

        if (exists) {

          throw new Error(
            firebaseError.message ||
            "User already registered"
          );
        }

        const savedUser = {
          id: Date.now(),
          displayName: cleanName,
          email: cleanEmail,
          password,
          createdAt: new Date().toISOString(),
        };

        const nextUsers = [
          ...users,
          savedUser,
        ];

        localStorage.setItem(
          USERS_KEY,
          JSON.stringify(nextUsers)
        );

        const currentUser = {
          id: savedUser.id,
          displayName: savedUser.displayName,
          email: savedUser.email,
        };

        localStorage.setItem(
          CURRENT_USER_KEY,
          JSON.stringify(currentUser)
        );

        setUser(currentUser);
      }
    };

  const login =
    async ({ email, password }) => {

      const cleanEmail =
        email.trim().toLowerCase();

      try {

        const credential =
          await signInWithEmailAndPassword(
            auth,
            cleanEmail,
            password
          );

        const currentUser =
          saveLocalUser(
            credential.user,
            password
          );

        setUser(currentUser);

        return;

      } catch (firebaseError) {

        const savedUser =
          findLocalUser(
            cleanEmail,
            password
          );

        if (!savedUser) {

          throw new Error(
            firebaseError.message ||
            "Invalid email or password"
          );
        }

        const currentUser =
          saveLocalUser(
            savedUser,
            password
          );

        setUser(currentUser);
      }
    };

  const loginWithGoogle =
    async () => {

      const credential =
        await signInWithPopup(
          auth,
          provider
        );

      const currentUser =
        saveLocalUser(
          credential.user
        );

      setUser(currentUser);
    };

  const logout =
    async () => {

      try {

        await signOut(auth);

      } catch (error) {

        console.error(
          "Firebase logout failed",
          error
        );
      }

      localStorage.removeItem(
        CURRENT_USER_KEY
      );

      setUser(null);
    };

  return (

    <AuthContext.Provider
      value={{
        user,
        signup,
        login,
        loginWithGoogle,
        logout,
      }}
    >

      {!loading && children}

    </AuthContext.Provider>
  );
}

export function useAuth() {

  return useContext(
    AuthContext
  );
}
