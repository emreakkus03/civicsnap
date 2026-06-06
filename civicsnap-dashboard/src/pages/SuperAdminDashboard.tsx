import React, { useState, useEffect } from 'react';
import { teams, databases, appwriteConfig } from '@core/appwrite';
import { ID, Models, Permission, Role } from 'appwrite';
import { X, Settings, Edit, Mail, Trash2 } from 'lucide-react';

import Header from '@components/Header';
import Sidebar from '@components/Sidebar';
import { useTranslation } from "react-i18next";

interface Organization extends Models.Document {
    name: string;
    zip_codes: string;
    contact_email: string;
    logo_url?: string | null;
    status: 'active' | 'blocked' | 'pending';
}

export default function SuperAdminDashboard() {
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [zipCodes, setZipCodes] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loadingOrganizations, setLoadingOrganizations] = useState(true);

    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
    const [editName, setEditName] = useState('');
    const [editContactEmail, setEditContactEmail] = useState('');
    const [editZipCodes, setEditZipCodes] = useState('');
    const [editLogoUrl, setEditLogoUrl] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // --- AANGEPAST: State voor mobiele sidebar ---
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const closeDropdown = () => setActiveDropdown(null);

    const { t } = useTranslation();

    const fetchOrganizations = async () => {
        setLoadingOrganizations(true);
        try {
            const organizationResponse = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.organizationsCollectionId
            );
            setOrganizations(organizationResponse.documents as unknown as Organization[]);
        } catch (error) {
            console.error(t('superAdminDashboard.toast.fetchOrgError'), error);
        } finally {
            setLoadingOrganizations(false);
        }
    };

    useEffect(() => {
        fetchOrganizations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCreateOrganization = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const team = await teams.create(ID.unique(), name);

            await databases.createDocument(
                appwriteConfig.databaseId,
                appwriteConfig.organizationsCollectionId,
                team.$id,
                {
                    name: name,
                    contact_email: contactEmail,
                    zip_codes: zipCodes,
                    logo_url: logoUrl || null,
                    status: 'active'
                },
                [
                    Permission.read(Role.team(team.$id)),
                    Permission.update(Role.team(team.$id))
                ]
            );

            const loginUrl = `${window.location.origin}/login`;

            await teams.createMembership(
                team.$id,
                ['org_admin', 'owner'],
                contactEmail,
                undefined,
                undefined,
                loginUrl,
                'Ambtenaar'
            );

            setMessage({ type: 'success', text: t('superAdminDashboard.toast.createSuccess', { name: name, email: contactEmail }) });

            setName('');
            setContactEmail('');
            setZipCodes('');
            setLogoUrl('');
            setShowForm(false);

            fetchOrganizations();

        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || t('superAdminDashboard.toast.createError') });
        } finally {
            setLoading(false);
        }
    };

    const toggleOrganizationStatus = async (org: Organization) => {
        const newStatus = org.status === 'active' ? 'blocked' : 'active';
        try {
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.organizationsCollectionId,
                org.$id,
                { status: newStatus }
            );
            setOrganizations(prevOrgs => prevOrgs.map(o => o.$id === org.$id ? { ...o, status: newStatus } : o));
        } catch (error) {
            console.error('Error updating organization status:', error);
            setMessage({ type: 'error', text: t('superAdminDashboard.toast.statusUpdateError') });
        }
    };

    const handleResendInvitation = async (org: Organization) => {
        try {
            const memberships = await teams.listMemberships(org.$id);
            const existingMember = memberships.memberships.find(m => m.userEmail === org.contact_email);

            if (existingMember) {
                if (existingMember.confirm) {
                    setMessage({ type: 'error', text: t('superAdminDashboard.toast.inviteAlreadyMember', { email: org.contact_email }) });
                    closeDropdown();
                    return;
                }
                await teams.deleteMembership(org.$id, existingMember.$id);
            }

            const loginUrl = `${window.location.origin}/login`;
            await teams.createMembership(
                org.$id,
                ['org_admin', 'owner'],
                org.contact_email,
                undefined,
                undefined,
                loginUrl,
                'Ambtenaar'
            );
            setMessage({ type: 'success', text: t('superAdminDashboard.toast.inviteResendSuccess', { email: org.contact_email }) });
        } catch (error: any) {
            console.error('Error resending invitation:', error);
            setMessage({ type: 'error', text: error.message || t('superAdminDashboard.toast.inviteResendError') });
        }
        closeDropdown();
    };

    const handleDeleteOrganization = async (org: Organization) => {
        if (!window.confirm(t('superAdminDashboard.toast.deleteConfirm', { name: org.name }))) {
            return;
        }

        try {
            await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.organizationsCollectionId, org.$id);
            await teams.delete(org.$id);

            setOrganizations(prevOrgs => prevOrgs.filter(o => o.$id !== org.$id));
            setMessage({ type: 'success', text: t('superAdminDashboard.toast.deleteSuccess', { name: org.name }) });
        } catch (error) {
            setMessage({ type: 'error', text: t('superAdminDashboard.toast.deleteError') });
        }
        closeDropdown();
    };

    const openEditModal = (org: Organization) => {
        setEditingOrganization(org);
        setEditName(org.name);
        setEditContactEmail(org.contact_email);
        setEditZipCodes(org.zip_codes);
        setEditLogoUrl(org.logo_url || '');
        closeDropdown();
    };

    const handleUpdateOrganization = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingOrganization) return;
        setIsUpdating(true);

        try {
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.organizationsCollectionId,
                editingOrganization.$id,
                {
                    name: editName,
                    contact_email: editContactEmail,
                    zip_codes: editZipCodes,
                    logo_url: editLogoUrl || null
                }
            );

            await teams.updateName(editingOrganization.$id, editName);

            setOrganizations(prevOrgs => prevOrgs.map(o => o.$id === editingOrganization.$id ? { ...o, name: editName, contact_email: editContactEmail, zip_codes: editZipCodes, logo_url: editLogoUrl } : o));
            setMessage({ type: 'success', text: t('superAdminDashboard.toast.updateSuccess', { name: editName }) });

            setEditingOrganization(null);
        } catch (error) {
            console.error('Error updating organization:', error);
            setMessage({ type: 'error', text: t('superAdminDashboard.toast.updateError') });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        // --- AANGEPAST: Vaste h-screen flex-col layout ---
        <div className="flex flex-col h-screen bg-[#F5F7FA] font-inter" onClick={closeDropdown}>

            <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar 
                    activeItem="organizations" 
                    isOpen={isSidebarOpen} 
                    onClose={() => setIsSidebarOpen(false)} 
                />
                
                {/* --- AANGEPAST: overflow-y-auto en responsieve padding --- */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
                    <div className="max-w-6xl mx-auto space-y-6">

                        {/* Page title and "Add Organization" button */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h2 className="text-2xl md:text-3xl font-inter-bold text-gray-900">{t('superAdminDashboard.title')}</h2>

                            {!showForm && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-[#0870C4] text-white font-inter-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-sm md:text-base"
                                >
                                    {t('superAdminDashboard.addOrganizatonButton')}
                                </button>
                            )}
                        </div>

                        {message.text && !showForm && (
                            <div className={`p-3 md:p-4 rounded-xl font-inter-medium text-sm md:text-base ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {message.text}
                            </div>
                        )}

                        {/* ===== CREATE ORGANIZATION FORM ===== */}
                        {showForm && (
                            <div className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-300">
                                <div className="flex justify-between items-center mb-4 md:mb-6">
                                    <h3 className="text-lg md:text-xl font-inter-bold text-gray-800">{t('superAdminDashboard.form.title')}</h3>
                                </div>

                                {message.text && (
                                    <div className={`p-3 md:p-4 rounded-xl mb-4 md:mb-6 font-inter-medium text-sm md:text-base ${message.type === 'error' ? 'bg-red-50 text-red-700' : ''}`}>
                                        {message.text}
                                    </div>
                                )}

                                <form onSubmit={handleCreateOrganization} className="flex flex-col gap-4 md:gap-5">
                                    {/* --- AANGEPAST: grid-cols-1 op mobiel, md:grid-cols-2 op grotere schermen --- */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                                        <div className="flex flex-col gap-1.5 md:gap-2">
                                            <label className="font-inter-semibold text-gray-700 text-xs md:text-sm">{t('superAdminDashboard.form.nameLabel')}</label>
                                            <input type="text" placeholder={t('superAdminDashboard.form.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} className="p-2.5 md:p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] text-sm md:text-base" required />
                                        </div>

                                        <div className="flex flex-col gap-1.5 md:gap-2">
                                            <label className="font-inter-semibold text-gray-700 text-xs md:text-sm">{t('superAdminDashboard.form.zipcodeLabel')}</label>
                                            <input type="text" placeholder={t('superAdminDashboard.form.zipcodePlaceholder')} value={zipCodes} onChange={(e) => setZipCodes(e.target.value)} className="p-2.5 md:p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] text-sm md:text-base" required />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5 md:gap-2">
                                        <label className="font-inter-semibold text-gray-700 text-xs md:text-sm">{t('superAdminDashboard.form.emailLabel')}</label>
                                        <input type="email" placeholder={t('superAdminDashboard.form.emailPlaceholder')} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="p-2.5 md:p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] text-sm md:text-base" required />
                                        <p className="text-[10px] md:text-xs text-gray-500">{t('superAdminDashboard.form.emailInfoText')}</p>
                                    </div>

                                    {/* --- AANGEPAST: flex-col-reverse op mobiel voor knoppen --- */}
                                    <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 mt-2 md:mt-4">
                                        <button type="button" onClick={() => setShowForm(false)} className="w-full sm:w-auto px-6 py-3 md:py-4 rounded-xl bg-gray-100 text-gray-700 font-inter-bold hover:bg-gray-200 transition-colors text-sm md:text-base">
                                            {t('general.cancelButton')}
                                        </button>
                                        <button type="submit" disabled={loading} className="w-full sm:flex-1 p-3 md:p-4 rounded-xl bg-[#0870C4] text-white font-inter-bold hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm md:text-base">
                                            {loading ? t('superAdminDashboard.form.submitLoadingButton') : t('superAdminDashboard.form.submitButton')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* ===== ORGANIZATIONS TABLE ===== */}
                        {!showForm && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                {loadingOrganizations ? (
                                    <div className="p-8 md:p-10 text-center text-gray-500 font-inter-medium text-sm md:text-base">{t('superAdminDashboard.loadingOrganizations')}</div>
                                ) : organizations.length === 0 ? (
                                    <div className="p-8 md:p-10 text-center text-gray-500 font-inter-medium text-sm md:text-base">{t('superAdminDashboard.NoOrganizations')}</div>
                                ) : (
                                    // --- AANGEPAST: overflow-x-auto met min-width en whitespace-nowrap ---
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead>
                                                <tr className="border-b border-gray-100 text-gray-800 font-inter-bold text-xs md:text-sm bg-gray-50">
                                                    <th className="py-3 md:py-4 px-4 md:px-6 w-20 md:w-24 whitespace-nowrap">{t('superAdminDashboard.table.logo')}</th>
                                                    <th className="py-3 md:py-4 px-4 md:px-6 whitespace-nowrap">{t('superAdminDashboard.table.name')}</th>
                                                    <th className="py-3 md:py-4 px-4 md:px-6 whitespace-nowrap">{t('superAdminDashboard.table.cityAdmin')}</th>
                                                    <th className="py-3 md:py-4 px-4 md:px-6 whitespace-nowrap">{t('superAdminDashboard.table.totalMembers')}</th>
                                                    <th className="py-3 md:py-4 px-4 md:px-6 whitespace-nowrap">{t('superAdminDashboard.table.status')}</th>
                                                    <th className="py-3 md:py-4 px-4 md:px-6 text-center whitespace-nowrap">{t('superAdminDashboard.table.actions')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {organizations.map((org) => (
                                                    <tr key={org.$id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                                        <td className="py-2 md:py-3 px-4 md:px-6">
                                                            {org.logo_url ? (
                                                                <img src={org.logo_url} alt={org.name} className="w-10 h-10 md:w-12 md:h-12 rounded-md object-cover border border-gray-200" />
                                                            ) : (
                                                                <div className="w-10 h-10 md:w-14 md:h-12 bg-[#1DA1F2] rounded-md flex items-center justify-center shadow-sm">
                                                                    <span className="text-white font-bold text-xs md:text-sm lowercase truncate px-1">
                                                                        {org.name.split(' ')[1] || org.name}:
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-2 md:py-3 px-4 md:px-6 text-gray-600 font-inter-medium text-sm md:text-base whitespace-nowrap">{org.name}</td>
                                                        <td className="py-2 md:py-3 px-4 md:px-6 text-gray-600 font-inter-medium text-sm md:text-base whitespace-nowrap">{org.contact_email}</td>
                                                        <td className="py-2 md:py-3 px-4 md:px-6 text-gray-600 font-inter-medium text-sm md:text-base whitespace-nowrap">1</td>
                                                        <td className="py-2 md:py-3 px-4 md:px-6 whitespace-nowrap">
                                                            <button
                                                                className={`w-10 md:w-12 h-5 md:h-6 rounded-full relative transition-colors duration-300 focus:outline-none ${org.status === 'active' ? 'bg-[#0F9D58]' : 'bg-gray-400'}`}
                                                                onClick={(e) => { e.stopPropagation(); toggleOrganizationStatus(org); }}
                                                            >
                                                                <div className={`w-4 h-4 md:w-5 md:h-5 bg-white rounded-full absolute top-[2px] shadow-sm transition-transform duration-300 ${org.status === 'active' ? 'translate-x-5 md:translate-x-6 left-[1px]' : 'translate-x-0.5'}`}></div>
                                                            </button>
                                                        </td>
                                                        <td className="py-2 md:py-3 px-4 md:px-6 text-center relative">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveDropdown(activeDropdown === org.$id ? null : org.$id);
                                                                }}
                                                                className="p-1.5 md:p-2 text-gray-400 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100 focus:outline-none"
                                                            >
                                                                <Settings size={20} className="md:w-5 md:h-5" />
                                                            </button>

                                                            {activeDropdown === org.$id && (
                                                                <div className="absolute right-12 top-8 md:top-10 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 text-left animate-in fade-in zoom-in-95 duration-200">
                                                                    <button onClick={(e) => { e.stopPropagation(); openEditModal(org); }} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-inter-medium transition-colors">
                                                                        <Edit size={16} /> {t('superAdminDashboard.organizationSettings.editButton')}
                                                                    </button>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleResendInvitation(org); }} className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-inter-medium transition-colors">
                                                                        <Mail size={16} /> {t('superAdminDashboard.organizationSettings.sendEmailButton')}
                                                                    </button>
                                                                    <div className="h-px bg-gray-100 my-1"></div>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteOrganization(org); }} className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-inter-medium transition-colors">
                                                                        <Trash2 size={16} /> {t('superAdminDashboard.organizationSettings.deleteButton')}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* ===== EDIT ORGANIZATION MODAL ===== */}
            {editingOrganization && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                            <h3 className="text-lg md:text-xl font-inter-bold text-gray-800">{t('superAdminDashboard.editForm.title')}</h3>
                            <button onClick={() => setEditingOrganization(null)} className="text-gray-400 hover:text-gray-600 transition focus:outline-none">
                                <X size={20} className="md:w-6 md:h-6" />
                            </button>
                        </div>

                        {/* --- AANGEPAST: overflow-y-auto voor als de content de schermhoogte overschrijdt --- */}
                        <form onSubmit={handleUpdateOrganization} className="p-4 md:p-6 flex flex-col gap-4 overflow-y-auto">
                            <div className="flex flex-col gap-1 md:gap-1.5">
                                <label className="font-inter-semibold text-gray-700 text-xs md:text-sm">{t('superAdminDashboard.editForm.nameLabel')}</label>
                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="p-2.5 md:p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] text-sm md:text-base" required />
                            </div>

                            <div className="flex flex-col gap-1 md:gap-1.5">
                                <label className="font-inter-semibold text-gray-700 text-xs md:text-sm">{t('superAdminDashboard.editForm.zipcodeLabel')}</label>
                                <input type="text" value={editZipCodes} onChange={(e) => setEditZipCodes(e.target.value)} className="p-2.5 md:p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] text-sm md:text-base" required />
                            </div>

                            <div className="flex flex-col gap-1 md:gap-1.5">
                                <label className="font-inter-semibold text-gray-700 text-xs md:text-sm">{t('superAdminDashboard.editForm.emailLabel')}</label>
                                <input type="email" value={editContactEmail} onChange={(e) => setEditContactEmail(e.target.value)} className="p-2.5 md:p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] text-sm md:text-base" required />
                                <p className="text-[10px] md:text-xs text-orange-500 font-inter-medium">{t('superAdminDashboard.editForm.emailWarningText')}</p>
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 mt-2 md:mt-4 flex-shrink-0">
                                <button type="button" onClick={() => setEditingOrganization(null)} className="w-full sm:w-auto px-6 py-2.5 md:py-3 rounded-xl bg-gray-100 text-gray-700 font-inter-bold hover:bg-gray-200 transition-colors text-sm md:text-base">
                                    {t('general.cancelButton')}
                                </button>
                                <button type="submit" disabled={isUpdating} className="w-full sm:flex-1 p-2.5 md:p-3 rounded-xl bg-[#0870C4] text-white font-inter-bold hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm md:text-base">
                                    {isUpdating ? t('superAdminDashboard.editForm.submitLoading') : t('superAdminDashboard.editForm.submitButton')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}