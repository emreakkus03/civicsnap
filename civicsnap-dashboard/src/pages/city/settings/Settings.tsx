import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@core/AuthProvider";
import {
  account,
  databases,
  storage,
  appwriteConfig,
  teams,
} from "@core/appwrite";
import { ID, Query, Permission, Role  } from "appwrite";
import toast from "react-hot-toast";

import Header from "@components/Header";
import Sidebar from "@components/Sidebar";

import { User, Camera, Lock, Shield, Eye, EyeOff, Plug } from "lucide-react";
import { useTranslation } from "react-i18next";

type AuthType = "api_key" | "bearer" | "basic";

interface SystemType {
  key: string;
  label: string;
}

export default function Settings() {
  const { profile } = useAuth();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<"profile" | "organization" | "organization_info" | "integrations">("profile");

  // --- AANGEPAST: State voor mobiele sidebar ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Profile Fields
  const [name, setName] = useState(profile?.full_name);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Team / Organization Members
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("org_officer");
  const [inviteLoading, setInviteLoading] = useState(false);

  // Organization Info Fields
  const [orgName, setOrgName] = useState("");
  const [orgLogoUrl, setOrgLogoUrl] = useState("");
  const [selectedOrgFile, setSelectedOrgFile] = useState<File | null>(null);
  const orgFileInputRef = useRef<HTMLInputElement>(null);

  // Permit Integration Fields
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [loadingIntegration, setLoadingIntegration] = useState(false);
  const [savingIntegration, setSavingIntegration] = useState(false);
  const [availableSystemTypes, setAvailableSystemTypes] = useState<SystemType[]>([]);
  const [systemType, setSystemType] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [authType, setAuthType] = useState<AuthType>("api_key");
  const [apiKey, setApiKey] = useState("");
  const [bearerToken, setBearerToken] = useState("");
  const [integrationUsername, setIntegrationUsername] = useState("");
  const [integrationPassword, setIntegrationPassword] = useState("");
  const [isIntegrationActive, setIsIntegrationActive] = useState(true);

  useEffect(() => {
    if (activeTab === "organization") fetchOrganizationMembers();
    if (activeTab === "integrations") {
      fetchSystemTypes();
      fetchIntegration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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
  }, [profile?.organization_id, t]);

  useEffect(() => {
    if (profile?.avatar_url && !avatarUrl) {
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile?.avatar_url, avatarUrl]);

const fetchOrganizationMembers = async () => {
    setLoadingMembers(true);
    try {
      const myOrganization = await teams.list();
      if (myOrganization.teams.length === 0) {
        setMembers([]);
        return;
      }
      
      const myOrganizationId = myOrganization.teams[0].$id;
      
      // --- AANGEPAST: We houden het veilig en strak op maximaal 25 ---
      const membersList = await teams.listMemberships(
        myOrganizationId,
        [Query.limit(25)] 
      );
      
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
            return { ...member, userName: "", userEmail: "" };
          }
        }),
      );
      
      const filteredMembers = membersWithUserData.filter(
        (member) => member.userEmail?.toLowerCase().trim() !== "civicsnapadminsuper@gmail.com",
      );
      
      setMembers(filteredMembers);
    } catch (error) {
      console.error(t("settings.toast.fetchOrgError"), error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchSystemTypes = async () => {
    try {
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.permitSystemTypesCollectionId,
        [
          Query.equal("is_active", true),
          Query.or([
            Query.equal("organization_id", profile?.organization_id ?? ""),
            Query.isNull("organization_id"),
          ])
        ]
      );
      const types = res.documents.map((doc) => ({ key: doc.key, label: doc.label }));
      setAvailableSystemTypes(types);
      if (types.length > 0 && !systemType) setSystemType(types[0].key);
    } catch (err) {
      console.error("Fout bij laden system types", err);
    }
  };

  const fetchIntegration = async () => {
    if (!profile?.organization_id) return;
    setLoadingIntegration(true);
    try {
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.integrationsCollectionId,
        [
          Query.equal("organization_id", profile.organization_id),
          Query.equal("service_type", "permits"),
          Query.limit(1),
        ]
      );
      if (res.documents.length > 0) {
        const doc = res.documents[0];
        setIntegrationId(doc.$id);
        setSystemType(doc.system_type);
        setApiUrl(doc.api_url);
        setIsIntegrationActive(doc.is_active);
        const creds = typeof doc.auth_credentials === "string" ? JSON.parse(doc.auth_credentials) : doc.auth_credentials;
        setAuthType(creds.type);
        setApiKey(creds.key ?? "");
        setBearerToken(creds.token ?? "");
        setIntegrationUsername(creds.username ?? "");
        setIntegrationPassword(creds.password ?? "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingIntegration(false);
    }
  };

  const buildCredentials = () => {
    switch (authType) {
      case "api_key": return { type: "api_key", key: apiKey };
      case "bearer": return { type: "bearer", token: bearerToken };
      case "basic": return { type: "basic", username: integrationUsername, password: integrationPassword };
    }
  };

  const handleSaveIntegration = async () => {
    const currentOrgId = profile?.organization_id;
    if (!currentOrgId) {
      toast.error("Geen organisatie gevonden. Vernieuw de pagina.");
      return;
    }

    setSavingIntegration(true);
    try {
      const payload = {
        organization_id: currentOrgId,
        service_type: "permits",
        system_type: systemType,
        api_url: apiUrl,
        auth_credentials: JSON.stringify(buildCredentials()),
        is_active: isIntegrationActive
      };

      if (integrationId) {
        await databases.updateDocument(appwriteConfig.databaseId, appwriteConfig.integrationsCollectionId, integrationId, payload);
      } else {
        const newDoc = await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.integrationsCollectionId,
          ID.unique(),
          payload,
          [
            Permission.read(Role.team(currentOrgId)),
            Permission.update(Role.team(currentOrgId, 'org_admin')),
            Permission.update(Role.team(currentOrgId, 'owner')),
            Permission.delete(Role.team(currentOrgId, 'owner')),
            Permission.delete(Role.team(currentOrgId, 'org_admin')),
          ]
        );
        setIntegrationId(newDoc.$id);
      }
      toast.success("Integratie opgeslagen!");
    } catch (err: any) {
      console.error("Appwrite Error:", err);
      toast.error(err.message || "Fout bij opslaan");
    } finally {
      setSavingIntegration(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!["org_admin", "super_admin"].includes(profile?.role)){
      toast.error(t("settings.toast.inviteAdminOnly"));
      return;
    }
    if (!inviteEmail) return;
    setInviteLoading(true);
    const toastId = toast.loading(t("settings.toast.inviteSending"));
    try {
      const myOrganization = await teams.list();
      const myOrganizationId = myOrganization.teams[0].$id;
      const loginUrl = `${window.location.origin}/login`;
      const rolesToAssign = inviteRole === "org_admin" ? [inviteRole, "owner"] : [inviteRole];
      await teams.createMembership(myOrganizationId, rolesToAssign, inviteEmail, undefined, undefined, loginUrl, "Nieuwe Collega");
      toast.success(t("settings.toast.inviteSuccess", { email: inviteEmail }), { id: toastId });
      setInviteEmail("");
      fetchOrganizationMembers();
    } catch (error) {
      toast.error(t("settings.toast.inviteError"), { id: toastId });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (membershipId: string, memberName: string) => {
    if (profile?.role !== "org_admin") {
      toast.error(t("settings.toast.removeAdminOnly"));
      return;
    }
    if (!window.confirm(t("settings.team.removeConfirm", { name: memberName }))) return;
    const toastId = toast.loading(t("settings.toast.removing"));
    try {
      const myOrganization = await teams.list();
      const myOrganizationId = myOrganization.teams[0].$id;
      const memberships = await teams.listMemberships(myOrganizationId);
      const memberToDelete = memberships.memberships.find((m) => m.$id === membershipId);
      await teams.deleteMembership(myOrganizationId, membershipId);
      if (memberToDelete?.userId) {
        try {
          await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.profilesCollectionId, memberToDelete.userId);
        } catch (dbError) {
          console.error("Profile was already missing", dbError);
        }
      }
      toast.success(t("settings.toast.removeSuccess"), { id: toastId });
      fetchOrganizationMembers();
    } catch (error) {
      toast.error(t("settings.toast.removeError"), { id: toastId });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    const toastId = toast.loading(t("settings.toast.saving"));
    try {
      let finalAvatarUrl = avatarUrl;
      if (selectedFile) {
        const uploadedFile = await storage.createFile(appwriteConfig.storageBucketId, ID.unique(), selectedFile);
        finalAvatarUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storageBucketId}/files/${uploadedFile.$id}/view?project=${appwriteConfig.projectId}`;
      }
      if (oldPassword || newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) { toast.error(t("settings.toast.passwordMismatch"), { id: toastId }); return; }
        if (!oldPassword) { toast.error(t("settings.toast.oldPasswordRequired"), { id: toastId }); return; }
        if (newPassword.length < 6) { toast.error(t("settings.toast.passwordLength"), { id: toastId }); return; }
        await account.updatePassword(newPassword, oldPassword);
      }
      if (name !== profile.full_name) await account.updateName(name);
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.profilesCollectionId,
        profile.$id,
        { full_name: name, avatar_url: finalAvatarUrl },
      );
      if (activeTab === "organization_info" && profile?.role === "org_admin") {
        let finalOrgLogoUrl = orgLogoUrl;
        if (selectedOrgFile) {
          const uploadedOrgFile = await storage.createFile(appwriteConfig.storageBucketId, ID.unique(), selectedOrgFile);
          finalOrgLogoUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storageBucketId}/files/${uploadedOrgFile.$id}/view?project=${appwriteConfig.projectId}`;
        }
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.organizationsCollectionId,
          profile.organization_id!,
          { name: orgName, logo_url: finalOrgLogoUrl },
        );
      }
      toast.success(t("settings.toast.saveSuccess"), { id: toastId });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSelectedFile(null);
    } catch (error) {
      toast.error(t("settings.toast.saveError"), { id: toastId });
    }
  };

  return (
    // --- AANGEPAST: h-screen en flex-col layout structuur ---
    <div className="flex flex-col h-screen bg-[#F5F7FA] font-inter">
      <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activeItem="settings" 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />

        {/* --- AANGEPAST: overflow-y-auto en meeschalende padding --- */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
          <div className="max-w-5xl mx-auto space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-6">
              {t("settings.title")}
            </h1>

            {/* ── AANGEPAST: Tab Navigation met horizontale scroll op mobiel ── */}
            <div className="flex border-b border-gray-200 mb-6 md:mb-8 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setActiveTab("profile")}
                className={`pb-3 md:pb-4 px-3 md:px-4 text-xs md:text-sm font-semibold transition-colors relative whitespace-nowrap ${
                  activeTab === "profile" ? "text-[#0870C4]" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t("settings.tabs.profile")}
                {activeTab === "profile" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0870C4] rounded-t-full" />}
              </button>

              {profile?.role === "org_admin" && (
                <button
                  onClick={() => setActiveTab("organization_info")}
                  className={`pb-3 md:pb-4 px-3 md:px-4 text-xs md:text-sm font-semibold transition-colors relative whitespace-nowrap ${
                    activeTab === "organization_info" ? "text-[#0870C4]" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t("settings.tabs.organization")}
                  {activeTab === "organization_info" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0870C4] rounded-t-full" />}
                </button>
              )}

              {profile?.role !== "org_viewer" && (
                <button
                  onClick={() => setActiveTab("organization")}
                  className={`pb-3 md:pb-4 px-3 md:px-4 text-xs md:text-sm font-semibold transition-colors relative whitespace-nowrap ${
                    activeTab === "organization" ? "text-[#0870C4]" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t("settings.tabs.team")}
                  {activeTab === "organization" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0870C4] rounded-t-full" />}
                </button>
              )}

              {(profile?.role === "org_admin" || profile?.role === "owner") && (
                <button
                  onClick={() => setActiveTab("integrations")}
                  className={`pb-3 md:pb-4 px-3 md:px-4 text-xs md:text-sm font-semibold transition-colors relative whitespace-nowrap ${
                    activeTab === "integrations" ? "text-[#0870C4]" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Integraties
                  {activeTab === "integrations" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0870C4] rounded-t-full" />}
                </button>
              )}
            </div>

            {/* ── Profile Tab Content ── */}
            {activeTab === "profile" && (
              // --- AANGEPAST: flex-col op mobiel, row vanaf md ---
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-8 flex flex-col md:flex-row gap-8 md:gap-12">
                <div className="flex flex-col items-center md:w-1/3">
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  <div
                    className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-100 border-4 border-white shadow-md flex items-center justify-center mb-4 md:mb-6 relative overflow-hidden group cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={t("settings.profile.altAvatar")} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 md:w-12 md:h-12 text-gray-400" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={24} className="text-white" />
                    </div>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#0870C4] text-white text-sm md:text-base font-semibold py-2 px-6 rounded-full hover:bg-blue-700 transition-colors shadow-sm w-full md:w-auto"
                  >
                    {t("settings.profile.changePhoto")}
                  </button>
                </div>

                <div className="flex-1 max-w-lg w-full">
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t("settings.profile.nameLabel")}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 md:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4] text-sm md:text-base"
                    />
                  </div>
                  <hr className="my-6 md:my-8 border-gray-100" />
                  
                  <div className="mb-6 md:mb-8">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Lock size={16} className="text-gray-500" /> {t("settings.profile.passwordTitle")}
                    </h3>
                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type={showOldPassword ? "text" : "password"}
                          placeholder={t("settings.profile.oldPassword")}
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          className="w-full px-4 py-2.5 md:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4] pr-12 text-sm md:text-base"
                        />
                        <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                          {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          placeholder={t("settings.profile.newPassword")}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2.5 md:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4] pr-12 text-sm md:text-base"
                        />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder={t("settings.profile.confirmPassword")}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2.5 md:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4] pr-12 text-sm md:text-base"
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <hr className="my-6 md:my-8 border-gray-100" />
                  <div className="flex justify-end">
                    <button onClick={handleSave} className="w-full md:w-auto bg-[#0870C4] text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200">
                      {t("general.saveButton").toUpperCase()}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Team Management Tab Content ── */}
            {activeTab === "organization" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-8">
                {(profile?.role === "org_admin" || profile?.role === "super_admin") && (
                  <>
                    <div className="mb-6 md:mb-8">
                      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1 md:mb-2">{t("settings.team.inviteTitle")}</h2>
                      <p className="text-xs md:text-sm text-gray-500 mb-4 md:mb-6">{t("settings.team.inviteSubtitle")}</p>
                      
                      {/* --- AANGEPAST: flex-col op mobiel zodat input velden stapelen --- */}
                      <form onSubmit={handleInviteMember} className="flex flex-col md:flex-row gap-3 md:gap-4 bg-gray-50 p-4 md:p-6 rounded-xl border border-gray-100">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">{t("settings.team.emailLabel")}</label>
                          <input
                            type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder={t("settings.team.emailPlaceholder")}
                            className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4] text-sm"
                          />
                        </div>
                        <div className="md:w-1/3">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">{t("settings.team.roleLabel")}</label>
                          <select
                            value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                            className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4] bg-white text-sm"
                          >
                            <option value="org_officer">{t("settings.team.roles.officer")}</option>
                            <option value="org_viewer">{t("settings.team.roles.viewer")}</option>
                            <option value="org_admin">{t("settings.team.roles.admin")}</option>
                          </select>
                        </div>
                        <div className="flex items-end mt-2 md:mt-0">
                          <button
                            type="submit" disabled={inviteLoading}
                            className="w-full md:w-auto bg-[#0870C4] text-white text-sm font-bold py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 h-auto md:h-[50px] flex items-center justify-center"
                          >
                            {inviteLoading ? t("settings.team.buttonLoading") : t("settings.team.buttonInvite")}
                          </button>
                        </div>
                      </form>
                    </div>
                    <hr className="border-gray-100 my-6 md:my-8" />
                  </>
                )}

                <div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">
                    {t("settings.team.tableTitle", { count: members.length })}
                  </h2>
                  {loadingMembers ? (
                    <div className="text-center text-gray-500 py-8 text-sm">{t("settings.team.tableLoading")}</div>
                  ) : (
                    // --- AANGEPAST: overflow-x-auto met min-width voor de team tabel ---
                    <div className="border border-gray-100 rounded-xl overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="bg-gray-50 text-gray-600 text-xs md:text-sm">
                          <tr>
                            <th className="py-3 px-4 font-semibold whitespace-nowrap">{t("settings.team.table.name")}</th>
                            <th className="py-3 px-4 font-semibold whitespace-nowrap">{t("settings.team.table.role")}</th>
                            <th className="py-3 px-4 font-semibold whitespace-nowrap">{t("settings.team.table.status")}</th>
                            {profile?.role === "org_admin" && (
                              <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">{t("settings.team.table.actions")}</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {members.map((member) => (
                            <tr key={member.$id} className="border-t border-gray-100 hover:bg-gray-50/50">
                              <td className="py-3 px-4">
                                <div className="font-medium text-gray-900">
                                  {member.profileName || member.userName || (member.confirm ? t("settings.team.unknownName") : t("settings.team.statusPending"))}
                                </div>
                                <div className="text-xs text-gray-500">{member.userEmail}</div>
                              </td>
                              <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                                {member.roles.includes("org_admin") ? t("settings.team.roles.admin").split(" ")[0]
                                  : member.roles.includes("org_officer") ? t("settings.team.roles.officer").split(" ")[0]
                                  : t("settings.team.roles.viewer").split(" ")[0]}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                {member.confirm ? (
                                  <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium">{t("settings.team.statusActive")}</span>
                                ) : (
                                  <span className="bg-orange-100 text-orange-700 text-xs px-2.5 py-1 rounded-full font-medium">{t("settings.team.statusPending")}</span>
                                )}
                              </td>
                              {profile?.role === "org_admin" && (
                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                  {(!member.userId || member.userId !== profile.$id) && (
                                    <button onClick={() => handleRemoveMember(member.$id, member.userName || member.userEmail)} className="text-red-500 hover:text-red-700 text-sm font-medium focus:outline-none">
                                      {t("settings.team.buttonRemove")}
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                          {members.length === 0 && (
                            <tr><td colSpan={4} className="text-center py-6 text-gray-500 text-sm">{t("settings.team.noMembers")}</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Organization Info Tab Content ── */}
            {activeTab === "organization_info" && profile?.role === "org_admin" && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-8 flex flex-col md:flex-row gap-8 md:gap-12">
                  <div className="flex flex-col items-center md:w-1/3">
                    <input type="file" accept="image/*" className="hidden" ref={orgFileInputRef} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) { setSelectedOrgFile(file); setOrgLogoUrl(URL.createObjectURL(file)); }
                      }}
                    />
                    <div
                      className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-gray-100 border-4 border-white shadow-md flex items-center justify-center mb-4 md:mb-6 relative overflow-hidden group cursor-pointer"
                      onClick={() => orgFileInputRef.current?.click()}
                    >
                      {orgLogoUrl ? (
                        <img src={orgLogoUrl} alt={t("settings.organization.altLogo")} className="w-full h-full object-contain p-2 bg-white" />
                      ) : (
                        <Shield className="w-10 h-10 md:w-12 md:h-12 text-gray-400" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={24} className="text-white" />
                      </div>
                    </div>
                    <button onClick={() => orgFileInputRef.current?.click()} className="bg-gray-100 text-gray-700 text-sm md:text-base font-semibold py-2 px-6 rounded-full hover:bg-gray-200 transition-colors shadow-sm w-full md:w-auto">
                      {t("settings.organization.uploadLogo")}
                    </button>
                  </div>
                  <div className="flex-1 max-w-lg w-full">
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{t("settings.organization.nameLabel")}</label>
                      <input
                        type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
                        className="w-full px-4 py-2.5 md:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4] text-sm md:text-base"
                        placeholder={t("settings.organization.namePlaceholder")}
                      />
                    </div>
                    <div className="flex justify-end mt-8 md:mt-12">
                      <button onClick={handleSave} className="w-full md:w-auto bg-[#0870C4] text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200">
                        {t("general.saveButton").toUpperCase()}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            {/* ── Integrations Tab Content ── */}
            {activeTab === "integrations" && (profile?.role === "org_admin" || profile?.role === "owner") && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-8">
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                  <Plug className="w-5 h-5 md:w-6 md:h-6 text-[#0870C4]" />
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Vergunningen API koppeling</h2>
                </div>
                <p className="text-xs md:text-sm text-gray-500 mb-6 md:mb-8">
                  Koppel de vergunningendatabank van uw gemeente aan CivicSnap.
                  Meldingen op adressen met een actieve vergunning worden
                  automatisch doorgestuurd naar de juiste aannemer.
                </p>

                {loadingIntegration ? (
                  <div className="flex items-center gap-3 text-gray-400 py-8">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm font-medium">Integratie laden...</span>
                  </div>
                ) : (
                  <div className="max-w-lg space-y-4 md:space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Systeem type</label>
                      <select
                        value={systemType} onChange={(e) => setSystemType(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#0870C4] bg-white"
                      >
                        {availableSystemTypes.length === 0 ? (
                          <option value="">Geen systemen beschikbaar</option>
                        ) : (
                          availableSystemTypes.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)
                        )}
                      </select>
                      <p className="text-[10px] md:text-xs text-gray-400 mt-1">
                        Het systeem type bepaalt hoe CivicSnap communiceert met de API van uw gemeente.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">API URL</label>
                      <input
                        type="url" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)}
                        placeholder="https://api.uwgemeente.be/v1"
                        className="w-full border border-gray-200 rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#0870C4]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Authenticatie type</label>
                      <select
                        value={authType} onChange={(e) => setAuthType(e.target.value as AuthType)}
                        className="w-full border border-gray-200 rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#0870C4] bg-white"
                      >
                        <option value="api_key">API Key</option>
                        <option value="bearer">Bearer Token</option>
                        <option value="basic">Gebruikersnaam &amp; Wachtwoord</option>
                      </select>
                    </div>

                    {authType === "api_key" && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">API Key</label>
                        <input
                          type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="••••••••••••••••"
                          className="w-full border border-gray-200 rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base font-mono focus:outline-none focus:ring-2 focus:ring-[#0870C4]"
                        />
                      </div>
                    )}
                    {authType === "bearer" && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Bearer Token</label>
                        <input
                          type="password" value={bearerToken} onChange={(e) => setBearerToken(e.target.value)} placeholder="••••••••••••••••"
                          className="w-full border border-gray-200 rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base font-mono focus:outline-none focus:ring-2 focus:ring-[#0870C4]"
                        />
                      </div>
                    )}
                    {authType === "basic" && (
                      // --- AANGEPAST: grid-cols-1 op mobiel, sm:grid-cols-2 op tablet ---
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Gebruikersnaam</label>
                          <input
                            type="text" value={integrationUsername} onChange={(e) => setIntegrationUsername(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#0870C4]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Wachtwoord</label>
                          <input
                            type="password" value={integrationPassword} onChange={(e) => setIntegrationPassword(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#0870C4]"
                          />
                        </div>
                      </div>
                    )}

                    <hr className="border-gray-100 my-4 md:my-6" />

                    <div className="flex items-center justify-between">
                      <div className="pr-4">
                        <p className="text-sm md:text-base font-semibold text-gray-700">Integratie actief</p>
                        <p className="text-xs text-gray-400 mt-0.5">Zet uit om de koppeling tijdelijk te pauzeren</p>
                      </div>
                      <button
                        onClick={() => setIsIntegrationActive(!isIntegrationActive)}
                        className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none shrink-0 ${isIntegrationActive ? "bg-[#0870C4]" : "bg-gray-200"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isIntegrationActive ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleSaveIntegration} disabled={savingIntegration}
                        className="w-full sm:w-auto bg-[#0870C4] text-white text-sm md:text-base font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 disabled:opacity-50"
                      >
                        {savingIntegration ? "Opslaan..." : "Integratie opslaan"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}