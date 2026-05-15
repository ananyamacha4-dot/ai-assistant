import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
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

  const email =
    userData.email?.trim().toLowerCase() ||
    "";

  return {
    id: userData.uid || userData.id || Date.now(),
    displayName:
      userData.displayName ||
      email.split("@")[0] ||
      "User",
    email,
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

    let authResolved = false;

    const fallbackTimer = setTimeout(
      () => {

        if (!authResolved) {

          authResolved = true;

          setUser(
            readJson(
              CURRENT_USER_KEY,
              null
            )
          );

          setLoading(false);
        }
      },
      3000
    );

    getRedirectResult(auth)
      .then((credential) => {

        if (!credential?.user) {

          return;
        }

        const currentUser =
          saveLocalUser(
            credential.user
          );

        setUser(currentUser);
      })
      .catch((firebaseError) => {

        console.warn(
          "Firebase redirect login failed",
          firebaseError
        );
      });

    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        (currentFirebaseUser) => {

          authResolved = true;

          clearTimeout(fallbackTimer);

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

      clearTimeout(fallbackTimer);

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
          "User already registered"
        );
      }

      const localUser = {
        id: Date.now(),
        displayName: cleanName,
        email: cleanEmail,
      };

      const currentUser =
        saveLocalUser(
          localUser,
          password
        );

      setUser(currentUser);

      createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      )
        .then(async (credential) => {

          await updateProfile(
            credential.user,
            {
              displayName: cleanName,
            }
          );

          const firebaseUser =
            saveLocalUser(
              {
                uid: credential.user.uid,
                displayName: cleanName,
                email: cleanEmail,
              },
              password
            );

          setUser(firebaseUser);
        })
        .catch((firebaseError) => {

          console.warn(
            "Firebase signup sync failed",
            firebaseError
          );
        });
    };

  const login =
    async ({ email, password }) => {

      const cleanEmail =
        email.trim().toLowerCase();

      if (!cleanEmail) {

        throw new Error(
          "Please enter your email"
        );
      }

      if (!password) {

        throw new Error(
          "Please enter your password"
        );
      }

      const savedUser =
        findLocalUser(
          cleanEmail,
          password
        );

      if (!savedUser) {

        throw new Error(
          "No local account found. Please signup first."
        );
      }

      const currentUser =
        saveLocalUser(
          savedUser,
          password
        );

      setUser(currentUser);

      signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      )
        .then((credential) => {

          const firebaseUser =
            saveLocalUser(
              credential.user,
              password
            );

          setUser(firebaseUser);
        })
        .catch((firebaseError) => {

          console.warn(
            "Firebase login sync failed",
            firebaseError
          );
        });
    };

  const loginWithGoogle =
    async () => {

      try {

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

      } catch (firebaseError) {

        const fallbackCodes = [
          "auth/cancelled-popup-request",
          "auth/popup-blocked",
          "auth/popup-closed-by-user",
          "auth/operation-not-supported-in-this-environment",
        ];

        if (
          fallbackCodes.includes(
            firebaseError?.code
          )
        ) {

          await signInWithRedirect(
            auth,
            provider
          );

          return;
        }

        throw firebaseError;
      }
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
