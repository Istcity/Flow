export { auth, db, default } from './config';
export {
  signInWithGoogle,
  getOrCreateUserProfile,
  fetchUserProfile,
  logOut,
  subscribeToAuthChanges,
} from './auth';
