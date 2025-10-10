import { supabase } from "./supabaseClient.js";

let savedSession = null;

async function getAdminSession() {
  return savedSession;
}

async function createAdminSession(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Login Error:", error);
    return { error: "Login failed" };
  }

  savedSession = data.session;
  return data;
}

async function logoutAdmin() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Logout Error: ", error);
    return { error: "Logout failed" };
  }

  savedSession = null;
  return { message: "Logged out successfully" };
}

async function saveAdminSession(session) {
  savedSession = session;
}

export default {
  getAdminSession,
  createAdminSession,
  logoutAdmin,
  saveAdminSession,
};
