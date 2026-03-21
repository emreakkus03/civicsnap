import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@core/AuthProvider";
import {
  account,
  databases,
  storage,
  appwriteConfig,
  teams,
} from "@core/appwrite";
import { ID } from "appwrite";
import toast from "react-hot-toast";

import Header from "@components/Header";
import Sidebar from "@components/Sidebar";

import { User, Camera, Lock, Shield, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Settings() {
  // Get the current user's profile from the auth context
  const { profile } = useAuth();
  // Translation hook for i18n support
  const { t } = useTranslation();

  // ─── Tab State ───────────────────────────────────────────────
  // Controls which settings tab is currently visible
  const [activeTab, setActiveTab] = useState<
    "profile" | "organization" | "organization_info"
  >("profile");

  // ─── Profile Fields ──────────────────────────────────────────
  // User's display name, pre-filled from their profile
  const [name, setName] = useState(profile?.full_name);

  // Password change fields
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Toggle visibility of each password field
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Avatar upload state
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Hidden file input ref so we can trigger it programmatically
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Team / Organization Members ─────────────────────────────
  // List of members in the current organization team
  const [members, setMembers] = useState<any[]>([]);
  // Loading indicator while fetching members
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Invite form fields
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("org_officer");
  const [inviteLoading, setInviteLoading] = useState(false);

  // ─── Organization Info Fields ────────────────────────────────
  // Organization name and logo (only editable by org_admin)
  const [orgName, setOrgName] = useState("");
  const [orgLogoUrl, setOrgLogoUrl] = useState("");
  const [selectedOrgFile, setSelectedOrgFile] = useState<File | null>(null);
  // Hidden file input ref for the organization logo upload
  const orgFileInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch Organization Members ──────────────────────────────
  // Retrieves all members of the user's organization team,
  // enriches each member with profile data (name, email),
  // and filters out the super-admin account.
  const fetchOrganizationMembers = async () => {
    setLoadingMembers(true);

    try {
      // Get all teams the current user belongs to
      const myOrganization = await teams.list();
      if (myOrganization.teams.length === 0) {
        setMembers([]);
        return;
      }

      // Use the first team as the user's organization
      const myOrganizationId = myOrganization.teams[0].$id;

      // Fetch all memberships for that team
      const membersList = await teams.listMemberships(myOrganizationId);

      // For each membership, look up the user's profile document
      // to get their full name and email
      const membersWithUserData = await Promise.all(
        membersList.memberships.map(async (member) => {
          try {
            const profileData = await databases.getDocument(
              appwriteConfig.databaseId,
              appwriteConfig.profilesCollectionId,
              member.userId,
            );

            return {
              ...member,
              userName: profileData.full_name,
              userEmail: profileData.email,
            };
          } catch (error) {
            // If the profile document doesn't exist, fall back to empty strings
            console.error(t("settings.toast.fetchUserError"), error);
            return { ...member, userName: "", userEmail: "" };
          }
        }),
      );

      // Filter out the super-admin email so it doesn't appear in the list
      const filteredMembers = membersWithUserData.filter(
        (member) =>
          member.userEmail?.toLowerCase().trim() !==
          "cixicsnapadminsuper@gmail.com",
      );

      setMembers(filteredMembers);
    } catch (error) {
      console.error(t("settings.toast.fetchOrgError"), error);
    } finally {
      setLoadingMembers(false);
    }
  };

  // ─── Effect: Load members when the "organization" (team) tab is activated
  useEffect(() => {
    if (activeTab === "organization") {
      fetchOrganizationMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ─── Effect: Load organization details (name, logo) when the profile loads
  useEffect(() => {
    const fetchOrgDetails = async () => {
      if (profile?.organization_id) {
        try {
          const orgData = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.organizationsCollectionId,
            profile.organization_id,
          );
          setOrgName(orgData.name || "");
          setOrgLogoUrl(orgData.logo_url || "");
        } catch (error) {
          console.error(t("settings.toast.fetchOrgDetailsError"), error);
        }
      }
    };
    fetchOrgDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.organization_id]);

  useEffect(() => {
    if (profile?.avatar_url && !avatarUrl) {
        setAvatarUrl(profile.avatar_url);
    }
}, [profile?.avatar_url]);

  // ─── Invite a New Member ─────────────────────────────────────
  // Creates a new team membership and sends an invitation email.
  // Only org_admin users are allowed to invite.
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: only admins can invite
    if (profile?.role !== "org_admin") {
      toast.error(t("settings.toast.inviteAdminOnly"));
      return;
    }

    if (!inviteEmail) return;
    setInviteLoading(true);

    const toastId = toast.loading(t("settings.toast.inviteSending"));

    try {
      // Get the current user's organization team
      const myOrganization = await teams.list();
      const myOrganizationId = myOrganization.teams[0].$id;

      // The URL the invited user will be redirected to after accepting
      const loginUrl = `${window.location.origin}/login`;

      // If the invited role is "org_admin", also assign the "owner" role
      // so they have full team management permissions in Appwrite
      const rolesToAssign =
        inviteRole === "org_admin" ? [inviteRole, "owner"] : [inviteRole];

      // Send the invitation via Appwrite Teams API
      await teams.createMembership(
        myOrganizationId,
        rolesToAssign,
        inviteEmail,
        undefined,
        undefined,
        loginUrl,
        "Nieuwe Collega", // Name shown in the invitation email
      );

      toast.success(t("settings.toast.inviteSuccess", { email: inviteEmail }), {
        id: toastId,
      });
      setInviteEmail("");
      // Refresh the members list to show the new pending member
      fetchOrganizationMembers();
    } catch (error) {
      toast.error(t("settings.toast.inviteError"), { id: toastId });
    } finally {
      setInviteLoading(false);
    }
  };

  // ─── Remove a Member ─────────────────────────────────────────
  // Deletes a team membership and also removes the user's profile
  // document from the database. Only org_admin can remove members.
  const handleRemoveMember = async (
    membershipId: string,
    memberName: string,
  ) => {
    // Guard: only admins can remove members
    if (profile?.role !== "org_admin") {
      toast.error(t("settings.toast.removeAdminOnly"));
      return;
    }

    // Confirm before proceeding with removal
    if (
      !window.confirm(t("settings.team.removeConfirm", { name: memberName }))
    ) {
      return;
    }

    const toastId = toast.loading(t("settings.toast.removing"));
    try {
      const myOrganization = await teams.list();
      const myOrganizationId = myOrganization.teams[0].$id;

      // Look up the membership to get the userId before deleting
      const memberships = await teams.listMemberships(myOrganizationId);
      const memberToDelete = memberships.memberships.find(
        (m) => m.$id === membershipId,
      );

      // Remove the membership from the team
      await teams.deleteMembership(myOrganizationId, membershipId);

      // Also delete the user's profile document from the database
      if (memberToDelete?.userId) {
        try {
          await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.profilesCollectionId,
            memberToDelete.userId,
          );
        } catch (dbError) {
          // Profile may have already been deleted — that's okay
          console.error("Profile was already missing from the database", dbError);
        }
      }
      toast.success(t("settings.toast.removeSuccess"), { id: toastId });
      // Refresh the table
      fetchOrganizationMembers();
    } catch (error) {
      toast.error(t("settings.toast.removeError"), { id: toastId });
    }
  };

  // ─── Handle Avatar File Selection ────────────────────────────
  // When the user picks a file, store it and show a local preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create a temporary object URL for instant preview
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  // ─── Save All Settings ───────────────────────────────────────
  // Handles saving profile info, password changes, avatar uploads,
  // and organization info (name + logo) when on that tab.
  const handleSave = async () => {
    if (!profile) return;
    const toastId = toast.loading(t("settings.toast.saving"));

    try {
      let finalAvatarUrl = avatarUrl;

      // Upload the new avatar file to Appwrite storage if one was selected
      if (selectedFile) {
        const uploadedFile = await storage.createFile(
          appwriteConfig.storageBucketId,
          ID.unique(),
          selectedFile,
        );

        // Build the public URL for the uploaded file
        const endpoint = appwriteConfig.endpoint;
        const projectId = appwriteConfig.projectId;
        finalAvatarUrl = `${endpoint}/storage/buckets/${appwriteConfig.storageBucketId}/files/${uploadedFile.$id}/view?project=${projectId}`;
      }

      // ── Password Change Logic ──────────────────────────────
      // Only attempt a password change if any password field was filled in
      if (oldPassword || newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
          toast.error(t("settings.toast.passwordMismatch"), { id: toastId });
          return;
        }
        if (!oldPassword) {
          toast.error(t("settings.toast.oldPasswordRequired"), { id: toastId });
          return;
        }
        if (newPassword.length < 6) {
          toast.error(t("settings.toast.passwordLength"), { id: toastId });
          return;
        }

        // Update the password via the Appwrite account API
        await account.updatePassword(newPassword, oldPassword);
      }

      // ── Update display name in Appwrite Auth if it changed ─
      if (name !== profile.full_name) {
        await account.updateName(name);
      }

      // ── Update the user's profile document in the database ─
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.profilesCollectionId,
        profile.$id,
        {
          full_name: name,
          avatar_url: finalAvatarUrl,
        },
      );

      // ── Organization Info Save (only for org_admin on that tab) ─
      if (activeTab === "organization_info" && profile?.role === "org_admin") {
        let finalOrgLogoUrl = orgLogoUrl;

        // Upload the new org logo if one was selected
        if (selectedOrgFile) {
          const uploadedOrgFile = await storage.createFile(
            appwriteConfig.storageBucketId,
            ID.unique(),
            selectedOrgFile,
          );
          finalOrgLogoUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storageBucketId}/files/${uploadedOrgFile.$id}/view?project=${appwriteConfig.projectId}`;
        }

        // Update the organization document in the database
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.organizationsCollectionId,
          profile.organization_id!,
          {
            name: orgName,
            logo_url: finalOrgLogoUrl,
          },
        );
      }

      toast.success(t("settings.toast.saveSuccess"), { id: toastId });

      // Reset password fields and file selection after successful save
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSelectedFile(null);
    } catch (error) {
      toast.error(t("settings.toast.saveError"), { id: toastId });
    }
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F7FA] font-inter">
      {/* Top navigation bar */}
      <Header />

      <div className="flex">
        {/* Left sidebar with "settings" highlighted */}
        <Sidebar activeItem="settings" />

        {/* Main content area */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            {/* Page title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              {t("settings.title")}
            </h1>

            {/* ── Tab Navigation ──────────────────────────────── */}
            <div className="flex border-b border-gray-200 mb-8">
              {/* Profile tab — always visible */}
              <button
                onClick={() => setActiveTab("profile")}
                className={`pb-4 px-4 text-sm font-semibold transition-colors relative ${
                  activeTab === "profile"
                    ? "text-[#0870C4]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t("settings.tabs.profile")}
                {activeTab === "profile" && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0870C4] rounded-t-full"></span>
                )}
              </button>

              {/* Organization info tab — only visible to org_admin */}
              {profile?.role === "org_admin" && (
                <button
                  onClick={() => setActiveTab("organization_info")}
                  className={`pb-4 px-4 text-sm font-semibold transition-colors relative ${
                    activeTab === "organization_info"
                      ? "text-[#0870C4]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t("settings.tabs.organization")}
                  {activeTab === "organization_info" && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0870C4] rounded-t-full"></span>
                  )}
                </button>
              )}

              {/* Team management tab — visible to everyone except viewers */}
              {profile?.role !== "org_viewer" && (
                <button
                  onClick={() => setActiveTab("organization")}
                  className={`pb-4 px-4 text-sm font-semibold transition-colors relative ${
                    activeTab === "organization"
                      ? "text-[#0870C4]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t("settings.tabs.team")}
                  {activeTab === "organization" && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0870C4] rounded-t-full"></span>
                  )}
                </button>
              )}
            </div>

            {/* ── Profile Tab Content ─────────────────────────── */}
            {activeTab === "profile" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row gap-12">
                {/* Left column: Avatar upload */}
                <div className="flex flex-col items-center md:w-1/3">
                  {/* Hidden file input for avatar selection */}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />

                  {/* Avatar preview circle — clicking opens file picker */}
                  <div
                    className="w-32 h-32 rounded-full bg-gray-100 border-4 border-white shadow-md flex items-center justify-center mb-6 relative overflow-hidden group cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {/* Show avatar image if available, otherwise show placeholder icon */}
                    {avatarUrl  ? (
                      <img
                        src={avatarUrl}
                        alt={t("settings.profile.altAvatar")}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={48} className="text-gray-400" />
                    )}
                    {/* Camera overlay that appears on hover */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={24} className="text-white" />
                    </div>
                  </div>
                  {/* Button to trigger the file input */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#0870C4] text-white font-semibold py-2 px-6 rounded-full hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    {t("settings.profile.changePhoto")}
                  </button>
                </div>

                {/* Right column: Name and password fields */}
                <div className="flex-1 max-w-lg">
                  {/* Full name input */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t("settings.profile.nameLabel")}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4]"
                    />
                  </div>

                  <hr className="my-8 border-gray-100" />

                  {/* Password change section */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Lock size={16} className="text-gray-500" />{" "}
                      {t("settings.profile.passwordTitle")}
                    </h3>
                    <div className="space-y-4">
                      {/* Old / current password input */}
                      <div className="relative">
                        <input
                          type={showOldPassword ? "text" : "password"}
                          placeholder={t("settings.profile.oldPassword")}
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4] pr-12"
                        />
                        {/* Toggle visibility button */}
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showOldPassword ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </button>
                      </div>

                      {/* New password input */}
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          placeholder={t("settings.profile.newPassword")}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4] pr-12"
                        />
                        {/* Toggle visibility button */}
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </button>
                      </div>

                      {/* Confirm new password input */}
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder={t("settings.profile.confirmPassword")}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4] pr-12"
                        />
                        {/* Toggle visibility button */}
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <hr className="my-8 border-gray-100" />

                  {/* Save button for profile changes */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleSave}
                      className="bg-[#0870C4] text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                    >
                      {t("general.saveButton").toUpperCase()}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Team Management Tab Content ─────────────────── */}
            {activeTab === "organization" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                {/* Invite form — only visible to org_admin users */}
                {profile?.role === "org_admin" && (
                  <>
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-2">
                        {t("settings.team.inviteTitle")}
                      </h2>
                      <p className="text-sm text-gray-500 mb-6">
                        {t("settings.team.inviteSubtitle")}
                      </p>

                      {/* Invite form: email, role selector, and submit button */}
                      <form
                        onSubmit={handleInviteMember}
                        className="flex flex-col md:flex-row gap-4 bg-gray-50 p-6 rounded-xl border border-gray-100"
                      >
                        {/* Email input for the new member */}
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            {t("settings.team.emailLabel")}
                          </label>
                          <input
                            type="email"
                            required
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder={t("settings.team.emailPlaceholder")}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4]"
                          />
                        </div>
                        {/* Role selector dropdown */}
                        <div className="md:w-1/3">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            {t("settings.team.roleLabel")}
                          </label>
                          <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4] bg-white"
                          >
                            <option value="org_officer">
                              {t("settings.team.roles.officer")}
                            </option>
                            <option value="org_viewer">
                              {t("settings.team.roles.viewer")}
                            </option>
                            <option value="org_admin">
                              {t("settings.team.roles.admin")}
                            </option>
                          </select>
                        </div>
                        {/* Submit / invite button */}
                        <div className="flex items-end">
                          <button
                            type="submit"
                            disabled={inviteLoading}
                            className="w-full md:w-auto bg-[#0870C4] text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 h-[50px]"
                          >
                            {inviteLoading
                              ? t("settings.team.buttonLoading")
                              : t("settings.team.buttonInvite")}
                          </button>
                        </div>
                      </form>
                    </div>
                    <hr className="border-gray-100 my-8" />
                  </>
                )}

                {/* Members table — visible to all non-viewer users */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">
                    {t("settings.team.tableTitle", { count: members.length })}
                  </h2>

                  {loadingMembers ? (
                    /* Loading state while fetching members */
                    <div className="text-center text-gray-500 py-8">
                      {t("settings.team.tableLoading")}
                    </div>
                  ) : (
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        {/* Table header */}
                        <thead className="bg-gray-50 text-gray-600 text-sm">
                          <tr>
                            <th className="py-3 px-4 font-semibold">
                              {t("settings.team.table.name")}
                            </th>
                            <th className="py-3 px-4 font-semibold">
                              {t("settings.team.table.role")}
                            </th>
                            <th className="py-3 px-4 font-semibold">
                              {t("settings.team.table.status")}
                            </th>
                            {/* Actions column only shown to admins */}
                            {profile?.role === "org_admin" && (
                              <th className="py-3 px-4 font-semibold text-right">
                                {t("settings.team.table.actions")}
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((member) => (
                            <tr
                              key={member.$id}
                              className="border-t border-gray-100 hover:bg-gray-50/50"
                            >
                              {/* Member name and email */}
                              <td className="py-3 px-4">
                                <div className="font-medium text-gray-900">
                                  {/* Priority: 1) database name, 2) auth name, 3) status fallback */}
                                  {member.profileName ||
                                    member.userName ||
                                    (member.confirm
                                      ? t("settings.team.unknownName")
                                      : t("settings.team.statusPending"))}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {member.userEmail}
                                </div>
                              </td>
                              {/* Member role — show only the first word of the role label */}
                              <td className="py-3 px-4 text-sm text-gray-700">
                                {member.roles.includes("org_admin")
                                  ? t("settings.team.roles.admin").split(" ")[0]
                                  : member.roles.includes("org_officer")
                                    ? t("settings.team.roles.officer").split(
                                        " ",
                                      )[0]
                                    : t("settings.team.roles.viewer").split(
                                        " ",
                                      )[0]}
                              </td>
                              {/* Member status badge: active (confirmed) or pending */}
                              <td className="py-3 px-4">
                                {member.confirm ? (
                                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                                    {t("settings.team.statusActive")}
                                  </span>
                                ) : (
                                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">
                                    {t("settings.team.statusPending")}
                                  </span>
                                )}
                              </td>

                              {/* Remove button — only shown to admins, and not for their own row */}
                              {profile?.role === "org_admin" && (
                                <td className="py-3 px-4 text-right">
                                  {(!member.userId ||
                                    member.userId !== profile.$id) && (
                                    <button
                                      onClick={() =>
                                        handleRemoveMember(
                                          member.$id,
                                          member.userName || member.userEmail,
                                        )
                                      }
                                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                                    >
                                      {t("settings.team.buttonRemove")}
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                          {/* Empty state when there are no members */}
                          {members.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="text-center py-6 text-gray-500"
                              >
                                {t("settings.team.noMembers")}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Organization Info Tab Content ───────────────── */}
            {/* Only rendered for org_admin users */}
            {activeTab === "organization_info" &&
              profile?.role === "org_admin" && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row gap-12">
                  {/* Left column: Organization logo upload */}
                  <div className="flex flex-col items-center md:w-1/3">
                    {/* Hidden file input for org logo selection */}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={orgFileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedOrgFile(file);
                          // Create a temporary preview URL
                          setOrgLogoUrl(URL.createObjectURL(file));
                        }
                      }}
                    />

                    {/* Logo preview box — clicking opens file picker */}
                    <div
                      className="w-32 h-32 rounded-xl bg-gray-100 border-4 border-white shadow-md flex items-center justify-center mb-6 relative overflow-hidden group cursor-pointer"
                      onClick={() => orgFileInputRef.current?.click()}
                    >
                      {/* Show logo if available, otherwise show placeholder shield icon */}
                      {orgLogoUrl ? (
                        <img
                          src={orgLogoUrl}
                          alt={t('settings.organization.altLogo')}
                          className="w-full h-full object-contain p-2 bg-white"
                        />
                      ) : (
                        <Shield size={48} className="text-gray-400" />
                      )}
                      {/* Camera overlay on hover */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={24} className="text-white" />
                      </div>
                    </div>
                    {/* Button to trigger the org logo file input */}
                    <button
                      onClick={() => orgFileInputRef.current?.click()}
                      className="bg-gray-100 text-gray-700 font-semibold py-2 px-6 rounded-full hover:bg-gray-200 transition-colors shadow-sm"
                    >
                      {t('settings.organization.uploadLogo')}
                    </button>
                  </div>

                  {/* Right column: Organization name field and save button */}
                  <div className="flex-1 max-w-lg">
                    {/* Organization name input */}
                    <div className="mb-6">
                     <label className="block text-sm font-semibold text-gray-700 mb-2">{t('settings.organization.nameLabel')}</label>
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4]"
                        placeholder={t('settings.organization.namePlaceholder')}
                      />
                    </div>

                    {/* Save button for organization info */}
                    <div className="flex justify-end mt-12">
                      <button
                        onClick={handleSave}
                        className="bg-[#0870C4] text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                      >
                        {t('general.saveButton').toUpperCase()}
                      </button>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </main>
      </div>
    </div>
  );
}
