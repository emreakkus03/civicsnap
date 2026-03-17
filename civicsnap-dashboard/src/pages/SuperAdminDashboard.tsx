import React, { useState, useEffect } from 'react';
import { teams, databases, appwriteConfig } from '@core/appwrite';
import { ID, Models, Permission, Role } from 'appwrite';
import { X, Settings, Edit, Mail, Trash2 } from 'lucide-react';

import Header from '@components/Header';
import Sidebar from '@components/Sidebar';
import { useTranslation } from "react-i18next";

// Extends the Appwrite Document model with organization-specific fields
interface Organization extends Models.Document {
    name: string;
    zip_codes: string;
    contact_email: string;
    logo_url?: string | null;
    status: 'active' | 'blocked' | 'pending';
}

export default function SuperAdminDashboard() {
    // --- State for the "Create Organization" form ---
    const [showForm, setShowForm] = useState(false); // Controls visibility of the create form
    const [name, setName] = useState(''); // Organization name input
    const [contactEmail, setContactEmail] = useState(''); // Admin email input
    const [zipCodes, setZipCodes] = useState(''); // Zip codes input
    const [logoUrl, setLogoUrl] = useState(''); // Logo URL input
    const [loading, setLoading] = useState(false); // Loading state for form submission
    const [message, setMessage] = useState({ type: '', text: '' }); // Toast/feedback message

    // --- State for the organizations list ---
    const [organizations, setOrganizations] = useState<Organization[]>([]); // List of all organizations
    const [loadingOrganizations, setLoadingOrganizations] = useState(true); // Loading state for fetching orgs

    // --- State for the actions dropdown menu per organization row ---
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null); // Tracks which row's dropdown is open

    // --- State for the "Edit Organization" modal ---
    const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null); // The org currently being edited
    const [editName, setEditName] = useState(''); // Editable name field
    const [editContactEmail, setEditContactEmail] = useState(''); // Editable email field
    const [editZipCodes, setEditZipCodes] = useState(''); // Editable zip codes field
    const [editLogoUrl, setEditLogoUrl] = useState(''); // Editable logo URL field
    const [isUpdating, setIsUpdating] = useState(false); // Loading state for update submission

    // Closes any open dropdown menu
    const closeDropdown = () => setActiveDropdown(null);

    // i18n translation hook
    const { t } = useTranslation();

    /**
     * Fetches all organizations from the Appwrite database
     * and stores them in state.
     */
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

    // Fetch organizations on initial component mount
    useEffect(() => {
        fetchOrganizations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Handles the creation of a new organization:
     * 1. Creates an Appwrite team
     * 2. Creates a corresponding document in the organizations collection
     * 3. Sends an invitation email to the contact email (creates a team membership)
     * 4. Resets the form and refreshes the organization list
     */
    const handleCreateOrganization = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            // Step 1: Create a new Appwrite team for this organization
            const team = await teams.create(ID.unique(), name);

            // Step 2: Create a document in the organizations collection,
            // using the team ID as the document ID so they stay linked
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
                    // Grant read and update permissions to members of this team
                    Permission.read(Role.team(team.$id)),
                    Permission.update(Role.team(team.$id))
                ]
            );

            // Step 3: Invite the contact email as an org_admin/owner of the team
            const loginUrl = `${window.location.origin}/login`;

            await teams.createMembership(
                team.$id,
                ['org_admin', 'owner'], // Roles assigned to the invited user
                contactEmail,
                undefined, // userId (not needed when inviting by email)
                undefined, // phone (not used)
                loginUrl,  // URL the user is redirected to after accepting
                'Ambtenaar' // Display name for the invited user
            );

            // Show success message
            setMessage({ type: 'success', text: t('superAdminDashboard.toast.createSuccess', { name: name, email: contactEmail }) });

            // Reset all form fields
            setName('');
            setContactEmail('');
            setZipCodes('');
            setLogoUrl('');
            setShowForm(false);

            // Refresh the organizations list
            fetchOrganizations();

        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || t('superAdminDashboard.toast.createError') });
        } finally {
            setLoading(false);
        }
    };

    /**
     * Toggles an organization's status between 'active' and 'blocked'.
     * Updates the database and reflects the change in local state.
     */
    const toggleOrganizationStatus = async (org: Organization) => {
        const newStatus = org.status === 'active' ? 'blocked' : 'active';
        try {
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.organizationsCollectionId,
                org.$id,
                { status: newStatus }
            );
            // Optimistically update local state without refetching
            setOrganizations(prevOrgs => prevOrgs.map(o => o.$id === org.$id ? { ...o, status: newStatus } : o));
        } catch (error) {
            console.error('Error updating organization status:', error);
            setMessage({ type: 'error', text: t('superAdminDashboard.toast.statusUpdateError') });
        }
    };

    /**
     * Resends the invitation email to the organization's contact email.
     * If the user already accepted the invite, it shows an error.
     * If a pending membership exists, it deletes it first and creates a new one.
     */
    const handleResendInvitation = async (org: Organization) => {
        try {
            // Get all current memberships for this team
            const memberships = await teams.listMemberships(org.$id);

            // Check if the contact email already has a membership
            const existingMember = memberships.memberships.find(m => m.userEmail === org.contact_email);

            if (existingMember) {
                // If they already confirmed/accepted, don't resend
                if (existingMember.confirm) {
                    setMessage({ type: 'error', text: t('superAdminDashboard.toast.inviteAlreadyMember', { email: org.contact_email }) });
                    closeDropdown();
                    return;
                }
                // Delete the old pending membership before creating a new one
                await teams.deleteMembership(org.$id, existingMember.$id);
            }

            // Create a fresh membership/invitation
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

    /**
     * Deletes an organization after user confirmation.
     * Removes both the database document and the Appwrite team.
     */
    const handleDeleteOrganization = async (org: Organization) => {
        // Ask the user for confirmation before proceeding
        if (!window.confirm(t('superAdminDashboard.toast.deleteConfirm', { name: org.name }))) {
            return;
        }

        try {
            // Delete the organization document from the database
            await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.organizationsCollectionId, org.$id);
            // Delete the corresponding Appwrite team
            await teams.delete(org.$id);

            // Remove the organization from local state
            setOrganizations(prevOrgs => prevOrgs.filter(o => o.$id !== org.$id));
            setMessage({ type: 'success', text: t('superAdminDashboard.toast.deleteSuccess', { name: org.name }) });
        } catch (error) {
            setMessage({ type: 'error', text: t('superAdminDashboard.toast.deleteError') });
        }
        closeDropdown();
    };

    /**
     * Opens the edit modal and populates it with the selected organization's data.
     */
    const openEditModal = (org: Organization) => {
        setEditingOrganization(org);
        setEditName(org.name);
        setEditContactEmail(org.contact_email);
        setEditZipCodes(org.zip_codes);
        setEditLogoUrl(org.logo_url || '');
        closeDropdown();
    };

    /**
     * Handles updating an existing organization:
     * 1. Updates the document in the database
     * 2. Updates the team name in Appwrite
     * 3. Reflects changes in local state and closes the modal
     */
    const handleUpdateOrganization = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingOrganization) return;
        setIsUpdating(true);

        try {
            // Update the organization document fields in the database
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

            // Also update the Appwrite team name to keep it in sync
            await teams.updateName(editingOrganization.$id, editName);

            // Optimistically update local state
            setOrganizations(prevOrgs => prevOrgs.map(o => o.$id === editingOrganization.$id ? { ...o, name: editName, contact_email: editContactEmail, zip_codes: editZipCodes, logo_url: editLogoUrl } : o));
            setMessage({ type: 'success', text: t('superAdminDashboard.toast.updateSuccess', { name: editName }) });

            // Close the edit modal
            setEditingOrganization(null);
        } catch (error) {
            console.error('Error updating organization:', error);
            setMessage({ type: 'error', text: t('superAdminDashboard.toast.updateError') });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        // Main page container; clicking anywhere closes any open dropdown
        <div className="min-h-screen bg-[#F5F7FA] font-inter" onClick={closeDropdown}>

            {/* Shared top navigation/header component */}
            <Header />

            {/* Main content area */}
            <div className="flex">
    <Sidebar activeItem="organizations" />
    <div className="flex-1 p-8 max-w-6xl mx-auto mt-8">

                {/* Page title and "Add Organization" button */}
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-inter-bold">{t('superAdminDashboard.title')}</h2>

                    {/* Only show the add button when the create form is hidden */}
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 px-5 py-3 bg-[#0870C4] text-white font-inter-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            {t('superAdminDashboard.addOrganizatonButton')}
                        </button>
                    )}
                </div>

                {/* Success/error feedback message (shown when the form is NOT visible) */}
                {message.text && !showForm && (
                    <div className={`p-4 rounded-xl mb-6 font-inter-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                {/* ===== CREATE ORGANIZATION FORM ===== */}
                {showForm && (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                        {/* Form header */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-inter-bold text-gray-800">{t('superAdminDashboard.form.title')}</h3>
                        </div>

                        {/* Error message inside the form */}
                        {message.text && (
                            <div className={`p-4 rounded-xl mb-6 font-inter-medium ${message.type === 'error' ? 'bg-red-50 text-red-700' : ''}`}>
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleCreateOrganization} className="flex flex-col gap-5">
                            {/* Row: Organization name + Zip codes */}
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

                            {/* Contact email field with info text */}
                            <div className="flex flex-col gap-2">
                                <label className="font-inter-semibold text-gray-700 text-sm">{t('superAdminDashboard.form.emailLabel')}</label>
                                <input type="email" placeholder={t('superAdminDashboard.form.emailPlaceholder')} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4]" required />
                                <p className="text-xs text-gray-500">{t('superAdminDashboard.form.emailInfoText')}</p>
                            </div>

                            {/* Cancel and Submit buttons */}
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

                {/* ===== ORGANIZATIONS TABLE ===== */}
                {!showForm && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
                        {/* Show loading spinner text while fetching */}
                        {loadingOrganizations ? (
                            <div className="p-10 text-center text-gray-500 font-inter-medium">{t('superAdminDashboard.loadingOrganizations')}</div>
                        ) : organizations.length === 0 ? (
                            /* Empty state when no organizations exist */
                            <div className="p-10 text-center text-gray-500 font-inter-medium">{t('superAdminDashboard.NoOrganizations')}</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                {/* Table header */}
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
                                    {/* Render a row for each organization */}
                                    {organizations.map((org) => (
                                        <tr key={org.$id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">

                                            {/* Logo column: show image if available, otherwise a colored placeholder with initials */}
                                            <td className="py-3 px-6">
                                                {org.logo_url ? (
                                                    <img src={org.logo_url} alt={org.name} className="w-12 h-12 rounded-md object-cover border border-gray-200" />
                                                ) : (
                                                    <div className="w-14 h-12 bg-[#1DA1F2] rounded-md flex items-center justify-center shadow-sm">
                                                        <span className="text-white font-bold text-sm lowercase truncate px-1">
                                                            {/* Show the second word of the name, or the full name as fallback */}
                                                            {org.name.split(' ')[1] || org.name}:
                                                        </span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Organization name column */}
                                            <td className="py-3 px-6 text-gray-500 font-inter-medium">{org.name}</td>

                                            {/* Contact email (city admin) column */}
                                            <td className="py-3 px-6 text-gray-500 font-inter-medium">{org.contact_email}</td>

                                            {/* Total members column (hardcoded to 1 for now) */}
                                            <td className="py-3 px-6 text-gray-500 font-inter-medium">1</td>

                                            {/* Status toggle switch: green = active, gray = blocked */}
                                            <td className="py-3 px-6">
                                                <button
                                                    className={`w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none ${org.status === 'active' ? 'bg-[#0F9D58]' : 'bg-gray-400'}`}
                                                    onClick={(e) => { e.stopPropagation(); toggleOrganizationStatus(org); }}
                                                >
                                                    {/* The sliding circle/knob inside the toggle */}
                                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform duration-300 ${org.status === 'active' ? 'translate-x-6.5 left-[1px]' : 'translate-x-0.5'}`}></div>
                                                </button>
                                            </td>

                                            {/* Actions column: settings gear icon with dropdown menu */}
                                            <td className="py-3 px-6 text-center relative">
                                                {/* Gear icon button to toggle the dropdown */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveDropdown(activeDropdown === org.$id ? null : org.$id);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100"
                                                >
                                                    <Settings size={20} />
                                                </button>

                                                {/* Dropdown menu with Edit, Resend Invite, and Delete actions */}
                                                {activeDropdown === org.$id && (
                                                    <div className="absolute right-12 top-10 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10 text-left animate-in fade-in zoom-in-95 duration-200">
                                                        {/* Edit organization button */}
                                                        <button onClick={(e) => { e.stopPropagation(); openEditModal(org); }} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-inter-medium">
                                                            <Edit size={16} /> {t('superAdminDashboard.organizationSettings.editButton')}
                                                        </button>
                                                        {/* Resend invitation email button */}
                                                        <button onClick={(e) => { e.stopPropagation(); handleResendInvitation(org); }} className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-inter-medium">
                                                            <Mail size={16} /> {t('superAdminDashboard.organizationSettings.sendEmailButton')}
                                                        </button>
                                                        {/* Divider line */}
                                                        <div className="h-px bg-gray-100 my-1"></div>
                                                        {/* Delete organization button (destructive action) */}
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
            </div>

            {/* ===== EDIT ORGANIZATION MODAL ===== */}
            {/* Rendered as a full-screen overlay when an organization is selected for editing */}
            {editingOrganization && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    {/* Modal card; stop propagation so clicking inside doesn't close the dropdown */}
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>

                        {/* Modal header with title and close button */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-xl font-inter-bold text-gray-800">{t('superAdminDashboard.editForm.title')}</h3>
                            <button onClick={() => setEditingOrganization(null)} className="text-gray-400 hover:text-gray-600 transition">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Edit form */}
                        <form onSubmit={handleUpdateOrganization} className="p-6 flex flex-col gap-4">
                            {/* Organization name field */}
                            <div className="flex flex-col gap-1">
                                <label className="font-inter-semibold text-gray-700 text-sm">{t('superAdminDashboard.editForm.nameLabel')}</label>
                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4]" required />
                            </div>

                            {/* Zip codes field */}
                            <div className="flex flex-col gap-1">
                                <label className="font-inter-semibold text-gray-700 text-sm">{t('superAdminDashboard.editForm.zipcodeLabel')}</label>
                                <input type="text" value={editZipCodes} onChange={(e) => setEditZipCodes(e.target.value)} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4]" required />
                            </div>

                            {/* Contact email field with warning that changing it won't update the invitation */}
                            <div className="flex flex-col gap-1">
                                <label className="font-inter-semibold text-gray-700 text-sm">{t('superAdminDashboard.editForm.emailLabel')}</label>
                                <input type="email" value={editContactEmail} onChange={(e) => setEditContactEmail(e.target.value)} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4]" required />
                                <p className="text-xs text-orange-500 font-inter-medium">{t('superAdminDashboard.editForm.emailWarningText')}</p>
                            </div>

                            {/* Submit button */}
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