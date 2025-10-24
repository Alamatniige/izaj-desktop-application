import React, { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Session } from "@supabase/supabase-js"
import { supabase } from "../lib/supabase";
import API_URL from "../../config/api";

interface ProfileProps {
  handleNavigation?: (page: string) => void;
  session: Session | null;
  setProfile: (profile: ProfileData) => void;
  profile: ProfileData | null;
}

export interface ProfileData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  address: string;
  avatar: string;
}

const Profile: React.FC<ProfileProps> = ({ session }) => {

  console.log("Profile session:",  session?.user.id);

  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "",
    address: "",
    avatar: "/profile.jpg",
  });

  const [editMode, setEditMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const getAvatarUrl = (avatarPath: string): string => {
    if (!avatarPath || avatarPath === '' || avatarPath === '/profile.jpg') {
      return '/profile.jpg';
    }

    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return `${avatarPath}?t=${Date.now()}`;
    }

    try {
      const { data } = supabase.storage.from('avatars').getPublicUrl(avatarPath);
      return `${data.publicUrl}?t=${Date.now()}`;
    } catch (error) {
      console.error("Error generating avatar URL:", error);
      return '/profile.jpg';
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) {
      console.error("File is missing or session ID is missing");
      setError("Invalid file or session.");
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (sessionError) {
        console.error("Session sync error:", sessionError);
        setError("Authentication error. Please try logging in again.");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || user.id !== session.user.id) {
        console.error("User ID mismatch or no user found");
        setError("Authentication mismatch. Please refresh and try again.");
        return;
      }

      const timestamp = Date.now();
      const filePath = `${session.user.id}/profile_${timestamp}.jpg`;

      try {
        const { data: files } = await supabase.storage
          .from('avatars')
          .list(session.user.id);
        
        if (files && files.length > 0) {
          const oldFiles = files.map(file => `${session.user.id}/${file.name}`);
          await supabase.storage
            .from('avatars')
            .remove(oldFiles);
        }
      } catch (cleanupError) {
        console.warn("Cleanup failed, but continuing with upload:", cleanupError);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '0',
          contentType: file.type,
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        setError("Upload failed: " + uploadError.message);
        return;
      }

      const avatarUrl = getAvatarUrl(filePath);

      const response = await fetch(`${API_URL}/api/profile/${session.user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...profile,
          avatar: filePath,
          password: "",
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        console.error("Backend avatar update failed:", result);
        setError(result.error || 'Failed to update profile avatar.');
        return;
      }

      const avatarImages = document.querySelectorAll('img[alt="Profile"]');
      avatarImages.forEach((img) => {
        (img as HTMLImageElement).src = avatarUrl;
      });

      setProfile(prev => ({
        ...prev,
        avatar: avatarUrl,
      }));

      setOriginalProfile(prev => prev ? {
        ...prev,
        avatar: avatarUrl,
      } : null);
      
      setSuccess("Profile photo updated successfully!");

      setTimeout(() => setSuccess(null), 3000);

    } catch (error) {
      console.error("Unexpected error during avatar upload:", error);
      setError("An unexpected error occurred during upload.");
    }
  };
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editMode) return;

    if (!profile.name.trim()) {
      setError("Name is required.");
      return;
    }

    if (
      originalProfile &&
      profile.name === originalProfile.name &&
      profile.phone === originalProfile.phone &&
      profile.address === originalProfile.address &&
      profile.password.trim() === ""
    ) {
      setError("No changes made to save.");
      return;
    }

    await updateUserProfile(profile);
  };

  const handleCancel = () => {
    setEditMode(false);
    setError(null);
    setSuccess(null);
    setProfile(prev => ({ ...prev, password: "" }));

    if (session?.user?.id) {
      fetchUserProfile(session.user.id);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/profile/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch profile');
      }

      const avatarUrl = getAvatarUrl(data.profile.avatar);

      const profileData = {
        name: data.profile.name || "",
        email: data.profile.email || "",
        password: "",
        phone: data.profile.phone || "",
        role: data.profile.role || "",
        address: data.profile.address || "",
        avatar: avatarUrl,
      };

      setProfile(profileData);
      setOriginalProfile(profileData);

    } catch (err: any) {
      console.error("Error fetching profile:", err);
      
      if (err.message.includes('not found') || err.message.includes('404')) {
        setError('Profile not found. Please contact support.');
      } else if (err.message.includes('401') || err.message.includes('Authorization')) {
        setError('Please log in again to view your profile.');
      } else if (err.message.includes('Network')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Unable to load profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile(session.user.id);
    } else {
      setLoading(false);
    }
  }, [session]);

  const updateUserProfile = async (profileData: ProfileData) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${API_URL}/api/profile/${session?.user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          name: profileData.name,
          phone: profileData.phone,
          address: profileData.address,
          password: profileData.password || undefined,
        }),
      });
      

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccess('Profile updated successfully!');
      setEditMode(false);
      
      setProfile(prev => ({ ...prev, password: "" }));
      
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-[#f7f8fa]">
        <div className="text-center">
          <Icon icon="mdi:loading" className="animate-spin text-yellow-400 w-8 h-8 mx-auto mb-2" />
          <p className="text-gray-600" style={{ fontFamily: "'Jost', sans-serif" }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="flex-1 px-8 py-6">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-white via-gray-50 to-white rounded-2xl p-6 mb-8 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl shadow-lg">
              <Icon icon="mdi:account-circle" className="text-2xl text-white" />
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>
                Profile Settings
              </h2>
              <p className="text-gray-600 text-base" style={{ fontFamily: "'Jost', sans-serif" }}>
                Manage your personal information and account settings
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Profile Card */}
          <div className="w-full lg:w-[375px] lg:min-w-[320px] lg:max-w-[430px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col items-center p-6 sm:p-8"
            style={{
              boxShadow: '0 4px 32px 0 rgba(147, 51, 234, 0.07)',
            }}>
            <button
              type="button"
              className="focus:outline-none transform hover:scale-105 transition-transform duration-200"
              onClick={() => fileInputRef.current?.click()}
              title="Change profile picture"
            >
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-100 border-4 border-purple-200 shadow-lg flex items-center justify-center overflow-hidden mb-4 relative group">
                <img
                  src={profile.avatar}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  key={profile.avatar}
                  onError={(e) => {
                    console.log("Image failed to load, using default");
                    const target = e.target as HTMLImageElement;
                    if (target.src !== "/profile.jpg") {
                      target.src = "/profile.jpg";
                    }
                  }}
                  onLoad={(e) => {
                    console.log("Avatar image loaded successfully:", (e.target as HTMLImageElement).src);
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                  <Icon icon="mdi:camera" className="text-white w-6 h-6 sm:w-8 sm:h-8" />
                </div>
              </div>
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleAvatarChange}
            />
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mt-2" style={{ fontFamily: "'Jost', sans-serif" }}>{profile.name}</h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-0.5 rounded-full mt-1 inline-block" style={{ fontFamily: "'Jost', sans-serif" }}>
                {profile.role}
              </span>
              <div className="mt-3">
                <p className="text-gray-400 text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>{profile.email}</p>
                <p className="text-gray-400 text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>{profile.phone}</p>
              </div>
            </div>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="lg:hidden bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4" style={{ fontFamily: "'Jost', sans-serif" }}>
              {error}
            </div>
          )}
          {success && (
            <div className="lg:hidden bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4" style={{ fontFamily: "'Jost', sans-serif" }}>
              {success}
            </div>
          )}

          {/* Profile Form */}
          <div className="flex-1 bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-8 lg:p-12 flex flex-col justify-center"
            style={{
              boxShadow: '0 4px 32px 0 rgba(147, 51, 234, 0.07)',
            }}>
            {/* Error and Success Messages for Desktop */}
            {error && (
              <div className="hidden lg:block bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6" style={{ fontFamily: "'Jost', sans-serif" }}>
                {error}
              </div>
            )}
            {success && (
              <div className="hidden lg:block bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6" style={{ fontFamily: "'Jost', sans-serif" }}>
                {success}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6 sm:space-y-8 max-w-2xl mx-auto w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                <div className="space-y-1">
                  <label className="block text-gray-700 font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    disabled={!editMode}
                    value={profile.name}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition disabled:bg-gray-50 text-gray-700 text-base sm:text-lg"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-gray-700 font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    disabled={!editMode}
                    value={profile.phone}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition disabled:bg-gray-50 text-gray-700 text-base sm:text-lg"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-gray-700 font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Address</label>
                  <input
                    type="text"
                    name="address"
                    disabled={!editMode}
                    value={profile.address || ""}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition disabled:bg-gray-50 text-gray-700 text-base sm:text-lg"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                    placeholder="Enter your address"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-gray-700 font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Role</label>
                  <input
                    type="text"
                    name="role"
                    disabled
                    value={profile.role}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-base sm:text-lg"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-gray-700 font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Email</label>
                  <input
                    type="email"
                    name="email"
                    disabled
                    value={profile.email}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-base sm:text-lg"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-gray-700 font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Password</label>
                  <input
                    type="password"
                    name="password"
                    disabled={!editMode}
                    value={profile.password}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition disabled:bg-gray-50 text-gray-700 text-base sm:text-lg"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                    placeholder={editMode ? "Enter new password" : "********"}
                  />
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 justify-end">
                {!editMode ? (
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="px-8 py-3 rounded-xl bg-purple-500 text-white font-semibold hover:bg-purple-600 transition shadow-md hover:shadow-lg text-lg"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  >
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-8 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition shadow-md hover:shadow-lg text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      style={{ fontFamily: "'Jost', sans-serif" }}
                    >
                      {saving && <Icon icon="mdi:loading" className="animate-spin w-4 h-4" />}
                      <span style={{ fontFamily: "'Jost', sans-serif" }}>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="px-8 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition shadow-md hover:shadow-lg text-lg disabled:opacity-50"
                      style={{ fontFamily: "'Jost', sans-serif" }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;