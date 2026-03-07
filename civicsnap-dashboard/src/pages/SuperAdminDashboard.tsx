import React, { useState, useEffect } from 'react';
import { teams, databases, appwriteConfig } from '@core/appwrite';
import { ID, Models, Permission, Role } from 'appwrite';
import {X, Settings, Edit, Mail, Trash2} from 'lucide-react';

import Header from '@components/Header';
import { useTranslation } from "react-i18next";

interface Organization extends Models.Document {
    name: string;
    zip_codes: string;
    contact_email: string;
    logo_url?: string|null;
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
        }catch (error) {
            console.error('Error fetching organizations:', error);
        }finally {
            setLoadingOrganizations(false);
        }
    };

    useEffect(() => {
        fetchOrganizations();
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

            setMessage({ type: 'success', text: `Succes! ${name} is aangemaakt en de uitnodiging is gemaild naar ${contactEmail}.` });
            
            
            setName('');
            setContactEmail('');
            setZipCodes('');
            setLogoUrl('');
            setShowForm(false); 

            fetchOrganizations();

        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || 'There is been an error creating the organization.' });
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
            }catch (error) {
                console.error('Error updating organization status:', error);
                setMessage({ type: 'error', text: 'Failed to update organization status.' });
            }
    };

    const handleResendInvitation = async (org: Organization) => {
        try {

            const memberships = await teams.listMemberships(org.$id);

            const existingMember = memberships.memberships.find(m => m.userEmail === org.contact_email);

            if (existingMember) {
                if(existingMember.confirm) {
                    setMessage({ type: 'error', text: `The user with email ${org.contact_email} is already a member of this organization.` });
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
            setMessage({ type: 'success', text: `Invitation successfully resent to ${org.contact_email}.` });
        } catch (error: any) {
           console.error('Error resending invitation:', error);
            setMessage({ type: 'error', text: error.message || 'Failed to resend invitation.' });
        }
        closeDropdown();
    };

    const handleDeleteOrganization = async (org: Organization) => {
        if (!window.confirm(`Are you sure you want to delete the organization "${org.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.organizationsCollectionId, org.$id);
            await teams.delete(org.$id);

            setOrganizations(prevOrgs => prevOrgs.filter(o => o.$id !== org.$id));
            setMessage({ type: 'success', text: `Organization "${org.name}" has been deleted.` });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to delete organization.' });
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
            setMessage({ type: 'success', text: `Organization "${editName}" has been updated.` });
            setEditingOrganization(null);
        } catch (error) {
            console.error('Error updating organization:', error);
            setMessage({ type: 'error', text: 'Failed to update organization.' });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F7FA] font-inter" onClick={closeDropdown}>
        
          <Header />

            <div className="p-8 max-w-6xl mx-auto mt-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-inter-bold">{t('superAdminDashboard.title')}</h2>
                    
                    {!showForm && (
                        <button 
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 px-5 py-3 bg-[#0870C4] text-white font-inter-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            
                           {t('superAdminDashboard.addOrganizatonButton')}
                        </button>
                    )}
                </div>
                
               
                {message.text && !showForm && (
                    <div className={`p-4 rounded-xl mb-6 font-inter-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                
                {showForm && (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-inter-bold text-gray-800">{t('superAdminDashboard.form.title')}</h3>
                            
                        </div>

                        {message.text && (
                            <div className={`p-4 rounded-xl mb-6 font-inter-medium ${message.type === 'error' ? 'bg-red-50 text-red-700' : ''}`}>
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleCreateOrganization} className="flex flex-col gap-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="flex flex-col gap-2">
                                    <label className="font-inter-semibold text-gray-700 text-sm">{t('superAdminDashboard.form.nameLabel')}</label>
                                    <input type="text" placeholder={t('superAdminDashboard.form.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4]" required />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="font-inter-semibold text-gray-700 text-sm">{t('superAdminDashboard.form.zipcodeLabel')}</label>
                                    <input type="text" placeholder={t('superAdminDashboard.form.zipcodePlaceholder')} value={zipCodes} onChange={(e) => setZipCodes(e.target.value)} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4]" required />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="font-inter-semibold text-gray-700 text-sm">{t('superAdminDashboard.form.emailLabel')}</label>
                                <input type="email" placeholder={t('superAdminDashboard.form.emailPlaceholder')} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4]" required />
                                <p className="text-xs text-gray-500">{t('superAdminDashboard.form.emailInfoText')}</p>
                            </div>

                            

                            <div className="flex gap-4 mt-4">
                                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-4 rounded-xl bg-gray-100 text-gray-700 font-inter-bold hover:bg-gray-200 transition-colors">
                                    {t('general.cancelButton')}
                                </button>
                                <button type="submit" disabled={loading} className="flex-1 p-4 rounded-xl bg-[#0870C4] text-white font-inter-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                                    {loading ? t('superAdminDashboard.form.submitLoadingButton') : t('superAdminDashboard.form.submitButton')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                
              
               {!showForm && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
                        {loadingOrganizations ? (
                            <div className="p-10 text-center text-gray-500 font-inter-medium">{t('superAdminDashboard.loadingOrganizations')}</div>
                        ) : organizations.length === 0 ? (
                            <div className="p-10 text-center text-gray-500 font-inter-medium">{t('superAdminDashboard.NoOrganizations')}</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 text-gray-800 font-inter-bold text-sm bg-white">
                                        <th className="py-4 px-6 w-24">{t('superAdminDashboard.table.logo')}</th>
                                        <th className="py-4 px-6">{t('superAdminDashboard.table.name')}</th>
                                        <th className="py-4 px-6">{t('superAdminDashboard.table.cityAdmin')}</th>
                                        <th className="py-4 px-6">{t('superAdminDashboard.table.totalMembers')}</th>
                                        <th className="py-4 px-6">{t('superAdminDashboard.table.status')}</th>
                                        <th className="py-4 px-6 text-center">{t('superAdminDashboard.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {organizations.map((org) => (
                                        <tr key={org.$id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            
                                            <td className="py-3 px-6">
                                                {org.logo_url ? (
                                                    <img src={org.logo_url} alt={org.name} className="w-12 h-12 rounded-md object-cover border border-gray-200" />
                                                ) : (
                                                    <div className="w-14 h-12 bg-[#1DA1F2] rounded-md flex items-center justify-center shadow-sm">
                                                        <span className="text-white font-bold text-sm lowercase truncate px-1">
                                                            {org.name.split(' ')[1] || org.name}:
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            
                                            
                                            <td className="py-3 px-6 text-gray-500 font-inter-medium">{org.name}</td>
                                            
                                            
                                            <td className="py-3 px-6 text-gray-500 font-inter-medium">{org.contact_email}</td>
                                            
                                            
                                            <td className="py-3 px-6 text-gray-500 font-inter-medium">1</td>
                                            
                                            
                                            <td className="py-3 px-6">
                                                <button 
                                                    className={`w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none ${org.status === 'active' ? 'bg-[#0F9D58]' : 'bg-gray-400'}`}
                                                    onClick={(e) => { e.stopPropagation();toggleOrganizationStatus(org); }}
                                                >
                                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform duration-300 ${org.status === 'active' ? 'translate-x-6.5 left-[1px]' : 'translate-x-0.5'}`}></div>
                                                </button>
                                            </td>
                                         
                                            <td className="py-3 px-6 text-center relative">
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setActiveDropdown(activeDropdown === org.$id ? null : org.$id); 
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100"
                                                >
                                                    <Settings size={20} />
                                                </button>

                                               
                                                {activeDropdown === org.$id && (
                                                    <div className="absolute right-12 top-10 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10 text-left animate-in fade-in zoom-in-95 duration-200">
                                                        <button onClick={(e) => {e.stopPropagation(); openEditModal(org); }} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-inter-medium">
                                                            <Edit size={16} /> {t('superAdminDashboard.organizationSettings.editButton')}
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleResendInvitation(org); }} className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-inter-medium">
                                                            <Mail size={16} /> {t('superAdminDashboard.organizationSettings.sendEmailButton')}
                                                        </button>
                                                        <div className="h-px bg-gray-100 my-1"></div>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteOrganization(org); }} className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-inter-medium">
                                                            <Trash2 size={16} /> {t('superAdminDashboard.organizationSettings.deleteButton')}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

            </div>

            {editingOrganization && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
                                <h3 className="text-xl font-inter-bold text-gray-800">{t('superAdminDashboard.editForm.title')}</h3>
                                <button onClick={() => setEditingOrganization(null)} className="text-gray-400 hover:text-gray-600 transition">
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleUpdateOrganization} className="p-6 flex flex-col gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="font-inter-semibold text-gray-700 text-sm">{t('superAdminDashboard.editForm.nameLabel')}</label>
                                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4]" required />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="font-inter-semibold text-gray-700 text-sm">{t('superAdminDashboard.editForm.zipcodeLabel')}</label>
                                    <input type="text" value={editZipCodes} onChange={(e) => setEditZipCodes(e.target.value)} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4]" required />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="font-inter-semibold text-gray-700 text-sm">{t('superAdminDashboard.editForm.emailLabel')}</label>
                                    <input type="email" value={editContactEmail} onChange={(e) => setEditContactEmail(e.target.value)} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4]" required />
                                    <p className="text-xs text-orange-500 font-inter-medium">{t('superAdminDashboard.editForm.emailWarningText')}</p>
                                </div>

                                <div className="flex gap-4 mt-2">
                                    <button type="submit" disabled={isUpdating} className="flex-1 p-3 rounded-xl bg-[#0870C4] text-white font-inter-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
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