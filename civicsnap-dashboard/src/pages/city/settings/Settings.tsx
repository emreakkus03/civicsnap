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

export default function Settings() {
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "profile" | "organization" | "organization_info"
  >("profile");

  const [name, setName] = useState(profile?.full_name);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("org_officer");
  const [inviteLoading, setInviteLoading] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [orgLogoUrl, setOrgLogoUrl] = useState("");
  const [selectedOrgFile, setSelectedOrgFile] = useState<File | null>(null);
  const orgFileInputRef = useRef<HTMLInputElement>(null);

  const fetchOrganizationMembers = async () => {
    setLoadingMembers(true);

    try {
      const myOrganization = await teams.list();
      if (myOrganization.teams.length === 0) {
        setMembers([]);
        return;
      }

      const myOrganizationId = myOrganization.teams[0].$id;

      const membersList = await teams.listMemberships(myOrganizationId);
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
            console.error("Fout bij het ophalen van gebruikersgegevens", error);
            return { ...member, userName: "", userEmail: "" };
          }
        }),
      );
      const filteredMembers = membersWithUserData.filter(
        (member) =>
          member.userEmail?.toLowerCase().trim() !==
          "cixicsnapadminsuper@gmail.com",
      );

      setMembers(filteredMembers);
    } catch (error) {
      console.error("Fout bij het ophalen van organisatieleden", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (activeTab === "organization") {
      fetchOrganizationMembers();
    }
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
          console.error("Fout bij het ophalen van organisatiegegevens", error);
        }
      }
    };
    fetchOrgDetails();
  }, [profile?.organization_id]);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (profile?.role !== "org_admin") {
      toast.error("Alleen een beheerder mag leden uitnodigen.");
      return;
    }

    if (!inviteEmail) return;
    setInviteLoading(true);

    const toastId = toast.loading("Uitnodiging verzenden...");

    try {
      const myOrganization = await teams.list();
      const myOrganizationId = myOrganization.teams[0].$id;
      const loginUrl = `${window.location.origin}/login`;

      const rolesToAssign =
        inviteRole === "org_admin" ? [inviteRole, "owner"] : [inviteRole];

      await teams.createMembership(
        myOrganizationId,
        rolesToAssign,
        inviteEmail,
        undefined,
        undefined,
        loginUrl,
        "Nieuwe Collega",
      );

      toast.success(`Uitnodiging succesvol verzonden naar ${inviteEmail}`, {
        id: toastId,
      });
      setInviteEmail("");
      fetchOrganizationMembers();
    } catch (error) {
      toast.error("Fout bij het verzenden van de uitnodiging", { id: toastId });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (
    membershipId: string,
    memberName: string,
  ) => {
    if (profile?.role !== "org_admin") {
      toast.error("Alleen een beheerder mag leden verwijderen.");
      return;
    }
    if (
      !window.confirm(`Weet je zeker dat je ${memberName} wilt verwijderen?`)
    ) {
      return;
    }

    const toastId = toast.loading("Lid verwijderen...");
    try {
      const myOrganization = await teams.list();
      const myOrganizationId = myOrganization.teams[0].$id;

      const memberships = await teams.listMemberships(myOrganizationId);
      const memberToDelete = memberships.memberships.find(
        (m) => m.$id === membershipId,
      );

      await teams.deleteMembership(myOrganizationId, membershipId);

      if (memberToDelete?.userId) {
        try {
          await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.profilesCollectionId,
            memberToDelete.userId,
          );
        } catch (dbError) {
          console.error("Profiel stond al niet meer in de database", dbError);
        }
      }
      toast.success("Lid succesvol verwijderd", { id: toastId });
      fetchOrganizationMembers();
    } catch (error) {
      toast.error("Fout bij het verwijderen van het lid", { id: toastId });
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
    const toastId = toast.loading("Instellingen opslaan...");

    try {
      let finalAvatarUrl = avatarUrl;

      if (selectedFile) {
        const uploadedFile = await storage.createFile(
          appwriteConfig.storageBucketId,
          ID.unique(),
          selectedFile,
        );

        const endpoint = appwriteConfig.endpoint;
        const projectId = appwriteConfig.projectId;
        finalAvatarUrl = `${endpoint}/storage/buckets/${appwriteConfig.storageBucketId}/files/${uploadedFile.$id}/view?project=${projectId}`;
      }

      if (oldPassword || newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
          toast.error("Nieuwe wachtwoorden komen niet overeen", {
            id: toastId,
          });
          return;
        }
        if (!oldPassword) {
          toast.error(
            "Oud wachtwoord is vereist om een nieuw wachtwoord in te stellen",
            { id: toastId },
          );
          return;
        }
        if (newPassword.length < 6) {
          toast.error("Nieuw wachtwoord moet minimaal 6 tekens bevatten", {
            id: toastId,
          });
          return;
        }

        await account.updatePassword(newPassword, oldPassword);
      }

      if (name !== profile.full_name) {
        await account.updateName(name);
      }

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.profilesCollectionId,
        profile.$id,
        {
          full_name: name,
          avatar_url: finalAvatarUrl,
          //notify_new_report: notifyNewReport,
          //notify_weekly_summary: notifyWeeklySummary,
        },
      );

      if (activeTab === 'organization_info' && profile?.role === 'org_admin') {
        let finalOrgLogoUrl = orgLogoUrl;

        if (selectedOrgFile) {
            const uploadedOrgFile = await storage.createFile(
                appwriteConfig.storageBucketId,
                ID.unique(),
                selectedOrgFile,
            );
            finalOrgLogoUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storageBucketId}/files/${uploadedOrgFile.$id}/view?project=${appwriteConfig.projectId}`;
        }

        await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.organizationsCollectionId,
            profile.organization_id!,
            {
                name: orgName,
                logo_url: finalOrgLogoUrl,
            }
        );
            
      }

      toast.success("Instellingen succesvol opgeslagen", { id: toastId });

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSelectedFile(null);
    } catch (error) {
      toast.error("Fout bij het opslaan van instellingen", { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-inter">
      <Header />

      <div className="flex">
        <Sidebar activeItem="settings" />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              Instellingen
            </h1>

            <div className="flex border-b border-gray-200 mb-8">
              <button
                onClick={() => setActiveTab("profile")}
                className={`pb-4 px-4 text-sm font-semibold transition-colors relative ${
                  activeTab === "profile"
                    ? "text-[#0870C4]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Mijn Profiel
                {activeTab === "profile" && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0870C4] rounded-t-full"></span>
                )}
              </button>

              {profile?.role === 'org_admin' && (
                <button
                    onClick={() => setActiveTab("organization_info")}
                    className={`pb-4 px-4 text-sm font-semibold transition-colors relative ${
                  activeTab === "organization_info"
                    ? "text-[#0870C4]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                >
                    Organisatie Profiel
                    {activeTab === "organization_info" && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0870C4] rounded-t-full"></span>
                    )}
                </button>

              )}

              {profile?.role !== "org_viewer" && (
                <button
                  onClick={() => setActiveTab("organization")}
                  className={`pb-4 px-4 text-sm font-semibold transition-colors relative ${
                    activeTab === "organization"
                      ? "text-[#0870C4]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Teamleden Beheer
                  {activeTab === "organization" && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0870C4] rounded-t-full"></span>
                  )}
                </button>
              )}
            </div>

            {activeTab === "profile" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row gap-12">
                <div className="flex flex-col items-center md:w-1/3">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />

                  <div
                    className="w-32 h-32 rounded-full bg-gray-100 border-4 border-white shadow-md flex items-center justify-center mb-6 relative overflow-hidden group cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={48} className="text-gray-400" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={24} className="text-white" />
                    </div>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#0870C4] text-white font-semibold py-2 px-6 rounded-full hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Profielfoto wijzigen
                  </button>
                </div>

                <div className="flex-1 max-w-lg">
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Naam
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4]"
                    />
                  </div>

                  <hr className="my-8 border-gray-100" />

                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Lock size={16} className="text-gray-500" /> Wachtwoord
                      wijzigen
                    </h3>
                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type={showOldPassword ? "text" : "password"}
                          placeholder="Huidig wachtwoord"
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4] pr-12"
                        />
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

                      {/* Nieuw wachtwoord */}
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Nieuw wachtwoord invoeren"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4] pr-12"
                        />
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

                      {/* Bevestig wachtwoord */}
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Bevestig nieuw wachtwoord"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4] pr-12"
                        />
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

                  <div className="flex justify-end">
                    <button
                      onClick={handleSave}
                      className="bg-[#0870C4] text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                    >
                      OPSLAAN
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "organization" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                {/* 1. CHECK: Alleen de org_admin mag dit formulier zien */}
                {profile?.role === "org_admin" && (
                  <>
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-2">
                        Nieuwe collega uitnodigen
                      </h2>
                      <p className="text-sm text-gray-500 mb-6">
                        Stuur een e-mailuitnodiging om een ambtenaar toe te
                        voegen aan het systeem.
                      </p>

                      <form
                        onSubmit={handleInviteMember}
                        className="flex flex-col md:flex-row gap-4 bg-gray-50 p-6 rounded-xl border border-gray-100"
                      >
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            E-mailadres
                          </label>
                          <input
                            type="email"
                            required
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="collega@gemeente.be"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4]"
                          />
                        </div>
                        <div className="md:w-1/3">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Rechten (Rol)
                          </label>
                          <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0870C4]"
                          >
                            <option value="org_officer">
                              Ambtenaar (Behandelen)
                            </option>
                            <option value="org_viewer">
                              Kijker (Alleen lezen)
                            </option>
                            <option value="org_admin">
                              Beheerder (Volledig)
                            </option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button
                            type="submit"
                            disabled={inviteLoading}
                            className="w-full md:w-auto bg-[#0870C4] text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 h-[50px]"
                          >
                            {inviteLoading ? "Laden..." : "UITNODIGEN"}
                          </button>
                        </div>
                      </form>
                    </div>
                    <hr className="border-gray-100 my-8" />
                  </>
                )}

                {/* Leden Tabel (Iedereen mag dit zien) */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">
                    Teamleden ({members.length})
                  </h2>

                  {loadingMembers ? (
                    <div className="text-center text-gray-500 py-8">
                      Leden laden...
                    </div>
                  ) : (
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-600 text-sm">
                          <tr>
                            <th className="py-3 px-4 font-semibold">
                              Naam & E-mail
                            </th>
                            <th className="py-3 px-4 font-semibold">Rol</th>
                            <th className="py-3 px-4 font-semibold">Status</th>
                            {/* 2. CHECK: Alleen admin ziet de Acties kolom titel */}
                            {profile?.role === "org_admin" && (
                              <th className="py-3 px-4 font-semibold text-right">
                                Acties
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
                              <td className="py-3 px-4">
                                <div className="font-medium text-gray-900">
                                  {/* Check 1: Database naam, 2: Auth naam, 3: Status */}
                                  {member.profileName ||
                                    member.userName ||
                                    (member.confirm
                                      ? "Naam onbekend"
                                      : "Wacht op acceptatie")}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {member.userEmail}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-700">
                                {member.roles.includes("org_admin")
                                  ? "Beheerder"
                                  : member.roles.includes("org_officer")
                                    ? "Ambtenaar"
                                    : "Kijker"}
                              </td>
                              <td className="py-3 px-4">
                                {member.confirm ? (
                                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                                    Actief
                                  </span>
                                ) : (
                                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">
                                    In afwachting
                                  </span>
                                )}
                              </td>

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
                                      Verwijderen
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                          {members.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="text-center py-6 text-gray-500"
                              >
                                Geen leden gevonden.
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

            {activeTab === 'organization_info' && profile?.role === 'org_admin' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row gap-12">
                                <div className="flex flex-col items-center md:w-1/3">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        ref={orgFileInputRef} 
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if(file) {
                                                setSelectedOrgFile(file);
                                                setOrgLogoUrl(URL.createObjectURL(file));
                                            }
                                        }} 
                                    />
                                    
                                    <div 
                                        className="w-32 h-32 rounded-xl bg-gray-100 border-4 border-white shadow-md flex items-center justify-center mb-6 relative overflow-hidden group cursor-pointer"
                                        onClick={() => orgFileInputRef.current?.click()}
                                    >
                                        {orgLogoUrl ? (
                                            <img src={orgLogoUrl} alt="Gemeente Logo" className="w-full h-full object-contain p-2 bg-white" />
                                        ) : (
                                            <Shield size={48} className="text-gray-400" />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera size={24} className="text-white" />
                                        </div>
                                    </div>
                                    <button onClick={() => orgFileInputRef.current?.click()} className="bg-gray-100 text-gray-700 font-semibold py-2 px-6 rounded-full hover:bg-gray-200 transition-colors shadow-sm">
                                        Logo uploaden
                                    </button>
                                </div>

                                <div className="flex-1 max-w-lg">
                                    <div className="mb-6">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Naam van de Organisatie</label>
                                        <input 
                                            type="text" 
                                            value={orgName}
                                            onChange={(e) => setOrgName(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4]"
                                            placeholder="Bijv. Gemeente Hamme"
                                        />
                                    </div>
                                    
                                    <div className="flex justify-end mt-12">
                                        <button 
                                            onClick={handleSave}
                                            className="bg-[#0870C4] text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                                        >
                                            OPSLAAN
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
