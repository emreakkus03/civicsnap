import { useEffect, useState } from "react";
import { databases, appwriteConfig } from "@core/appwrite";
import { Models, ID, Query, Permission, Role } from "appwrite";
import { useAuth } from "@core/AuthProvider";
import toast from "react-hot-toast";

import {
  Megaphone,
  Plus,
  Check,
  Clock,
  Edit,
  Trash2,
} from "lucide-react";

import Header from "@components/Header";
import Sidebar from "@components/Sidebar";

import { useTranslation } from "react-i18next";

interface Announcement extends Models.Document {
  title: string;
  content: string;
  start_at: string;
  ends_at: string;
  organization_id: string;
  priority: "low" | "medium" | "high" | string;
  is_active: boolean;
}

export default function Announcements() {
  const { profile } = useAuth();
  const { t } = useTranslation();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- AANGEPAST: State voor mobiele sidebar ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [priority, setPriority] = useState("low");

  const fetchAnnouncements = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);

    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.announcementsCollectionId,
        [
          Query.equal("organization_id", profile.organization_id),
          Query.orderDesc("start_at"),
          Query.limit(100) 
        ],
      );
      setAnnouncements(response.documents as unknown as Announcement[]);
    } catch (error) {
      toast.error(t('announcements.toast.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.organization_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;

    if (new Date(endsAt) <= new Date(startAt)) {
      toast.error(t('announcements.toast.dateError'));
      return;
    }

    if (!title || !content || !startAt || !endsAt) {
      toast.error(t('announcements.toast.validationError'));
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(t('announcements.modal.buttonLoading'));

    try {
      if (editingId) {
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.announcementsCollectionId,
          editingId,
          {
            title,
            content,
            start_at: new Date(startAt).toISOString(),
            ends_at: new Date(endsAt).toISOString(),
            priority,
          },
        );
        toast.success(t('announcements.toast.updateSuccess'), { id: toastId });
      } else {
        await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.announcementsCollectionId,
          ID.unique(),
          {
            title,
            content,
            start_at: new Date(startAt).toISOString(),
            ends_at: new Date(endsAt).toISOString(),
            organization_id: profile.organization_id,
            priority,
            is_active: true, 
          },
          [
            Permission.read(Role.users()),
            Permission.update(Role.team(profile.organization_id)),
            Permission.delete(Role.team(profile.organization_id)),
          ],
        );
        toast.success(t('announcements.toast.createSuccess'), { id: toastId });
      }

      const resetForm = () => {
        setTitle("");
        setContent("");
        setStartAt("");
        setEndsAt("");
        setPriority("low");
        setEditingId(null);
      };

      setIsModalOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      toast.error("Error creating announcement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (announcement: Announcement) => {
    setTitle(announcement.title);
    setContent(announcement.content);
    setStartAt(new Date(announcement.start_at).toISOString().slice(0, 16));
    setEndsAt(new Date(announcement.ends_at).toISOString().slice(0, 16));
    setPriority(announcement.priority);
    setEditingId(announcement.$id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('announcements.actions.deleteConfirm'))) return;

    const toastId = toast.loading(t('general.loading'));
    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.announcementsCollectionId,
        id,
      );
      toast.success(t('announcements.toast.deleteSuccess'), { id: toastId });
      fetchAnnouncements();
    } catch (error) {
      toast.error(t('announcements.toast.deleteError'), { id: toastId });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("nl-BE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">{t('announcements.priority.high')}</span>;
      case "medium": return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">{t('announcements.priority.medium')}</span>;
      case "low": return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">{t('announcements.priority.low')}</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-full">{t('announcements.priority.unknown')}</span>;
    }
  };

  const getAnnouncementStatus = (announcement: Announcement) => {
    if (!announcement.is_active) {
      return { label: t('announcements.status.paused'), color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
    }

    const now = new Date();
    const start = new Date(announcement.start_at);
    const end = new Date(announcement.ends_at);

    if (now > end) return { label: t('announcements.status.expired'), color: "bg-red-100 text-red-600", dot: "bg-red-400" };
    if (now >= start && now <= end) return { label: t('announcements.status.active'), color: "bg-green-100 text-green-600", dot: "bg-green-400" };

    if (now < start) {
      const diffMilisec = start.getTime() - now.getTime();
      const diffHours = Math.floor(diffMilisec / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      const diffMinutes = Math.floor(diffMilisec / (1000 * 60));

      let timeString = "";
      if (diffDays > 0) timeString = t('announcements.status.startsInDays', { days: diffDays });
      else if (diffHours > 0) timeString = t('announcements.status.startsInHours', { hours: diffHours });
      else timeString = t('announcements.status.startsInMins', { mins: diffMinutes });

      return { label: `${t('announcements.status.planned')} (${timeString})`, color: "bg-yellow-100 text-yellow-600", dot: "bg-yellow-400" };
    }

    return { label: t('announcements.status.unknown'), color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      await databases.updateDocument(appwriteConfig.databaseId, appwriteConfig.announcementsCollectionId, id, { is_active: !currentState });
      const actionText = !currentState ? t('announcements.actions.resume').toLowerCase() : t('announcements.actions.pause').toLowerCase();
      toast.success(t('announcements.toast.toggleSuccess', { status: actionText }));
      fetchAnnouncements();
    } catch (error) {
      toast.error(t('announcements.toast.toggleError'));
    }
  };

  const announcementsWithStatus = announcements.map((announcement) => ({
    ...announcement,
    status: getAnnouncementStatus(announcement),
  }));

  return (
    // --- AANGEPAST: h-screen en flex-col voor vaste layout structuur ---
    <div className="flex flex-col h-screen bg-[#F5F7FA] font-inter">
      <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activeItem="announcements" 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />

        {/* --- AANGEPAST: overflow-y-auto en padding --- */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
          <div className="max-w-7xl w-full mx-auto space-y-6">
          
            {/* --- AANGEPAST: Flex-col op mobiel, flex-row op tablet/desktop voor de titel en knop --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2 md:mb-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 md:gap-3">
                  <Megaphone className="text-[#0870C4] w-6 h-6 md:w-8 md:h-8" />
                  {t('announcements.title')}
                </h1>
                <p className="text-gray-500 mt-1 text-xs md:text-sm">
                  {t('announcements.subtitle')}
                </p>
              </div>
              
              {profile?.role !== "org_viewer" && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-[#0870C4] text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto text-sm md:text-base"
                >
                  <Plus size={20} />
                  {t('announcements.newButton')}
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-12 md:py-16 text-gray-400">
                  {t('general.loading')}
                </div>
              ) : announcements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 md:py-16 text-gray-400">
                  <Megaphone size={40} className="mb-3 text-gray-300" />
                  <span className="text-sm font-medium text-center px-4">
                    {t('announcements.noAnnouncements')}
                  </span>
                </div>
              ) : (
                // --- AANGEPAST: overflow-x-auto met een min-width op de tabel zodat data niet propt ---
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="py-3 md:py-4 px-4 md:px-6 text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{t('announcements.table.title')}</th>
                        <th className="py-3 md:py-4 px-4 md:px-6 text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{t('announcements.table.period')}</th>
                        <th className="py-3 md:py-4 px-4 md:px-6 text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{t('announcements.table.priority')}</th>
                        <th className="py-3 md:py-4 px-4 md:px-6 text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{t('announcements.table.status')}</th>
                        {profile?.role !== "org_viewer" && (
                           <th className="py-3 md:py-4 px-4 md:px-6 text-xs font-bold text-gray-500 uppercase text-right whitespace-nowrap">{t('announcements.table.actions')}</th>
                        )}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {announcementsWithStatus.map((row) => (
                        <tr key={row.$id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 md:py-4 px-4 md:px-6">
                            <p className="font-bold text-gray-800 text-sm md:text-base">
                              {row.title}
                            </p>
                            <p className="text-xs text-gray-500 truncate max-w-[200px] md:max-w-xs">
                              {row.content}
                            </p>
                          </td>

                          <td className="py-3 md:py-4 px-4 md:px-6">
                            <div className="flex flex-col text-xs md:text-sm text-gray-600 gap-1 whitespace-nowrap">
                              <span className="flex items-center gap-1.5">
                                <Check size={14} className="text-green-500" />{" "}
                                {formatDate(row.start_at)}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock size={14} className="text-red-400" />{" "}
                                {formatDate(row.ends_at)}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 md:py-4 px-4 md:px-6 whitespace-nowrap">
                            {getPriorityColor(row.priority)}
                          </td>

                          <td className="py-3 md:py-4 px-4 md:px-6 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 md:px-3 py-1 text-xs font-bold rounded-full ${row.status.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${row.status.dot}`}></span>
                              {row.status.label}
                            </span>
                          </td>

                          {profile?.role !== "org_viewer" && (
                            <td className="py-3 md:py-4 px-4 md:px-6 text-right">
                              <div className="flex items-center justify-end gap-1 md:gap-2">
                                <button
                                  onClick={() => handleToggleActive(row.$id, row.is_active)}
                                  title={row.is_active ? t('announcements.actions.pause') : t('announcements.actions.resume')}
                                  className={`px-2 md:px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${row.is_active ? "bg-orange-50 text-orange-600 hover:bg-orange-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}
                                >
                                  {row.is_active ? t('announcements.actions.pause') : t('announcements.actions.resume')}
                                </button>

                                <button
                                  onClick={() => handleOpenEdit(row)}
                                  title={t('announcements.actions.edit')}
                                  className="p-1.5 md:p-2 text-gray-400 hover:text-[#0870C4] hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit size={16} className="md:w-5 md:h-5" />
                                </button>

                                {profile?.role === "org_admin" && (
                                  <button
                                    onClick={() => handleDelete(row.$id)}
                                    title={t('announcements.actions.delete')}
                                    className="p-1.5 md:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={16} className="md:w-5 md:h-5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 md:p-5 border-b border-gray-100">
              <h3 className="text-lg md:text-xl font-bold text-gray-900">
                {editingId ? t('announcements.modal.titleEdit') : t('announcements.modal.titleNew')}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto p-4 md:p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('announcements.modal.formTitle')}</label>
                <input 
                  type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
                  placeholder={t('announcements.modal.formTitlePlaceholder')}
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0870C4] focus:outline-none text-sm md:text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('announcements.modal.formContent')}</label>
                <textarea 
                  value={content} onChange={(e) => setContent(e.target.value)} required
                  placeholder={t('announcements.modal.formContentPlaceholder')}
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-200 rounded-xl h-24 md:h-32 resize-none focus:ring-2 focus:ring-[#0870C4] focus:outline-none text-sm md:text-base"
                />
              </div>

              {/* --- AANGEPAST: grid-cols-1 op mobiel (boven elkaar), sm:grid-cols-2 vanaf tablet --- */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('announcements.modal.formStart')}</label>
                  <input 
                    type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm md:text-base focus:ring-2 focus:ring-[#0870C4] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('announcements.modal.formEnd')}</label>
                  <input 
                    type="datetime-local" min={startAt} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm md:text-base focus:ring-2 focus:ring-[#0870C4] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:mt-2">
                <div className="md:mt-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('announcements.modal.formPriority')}</label>
                  <select 
                    value={priority} onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 md:py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0870C4] focus:outline-none bg-white text-sm md:text-base"
                  >
                    <option value="low">{t('announcements.priority.low')}</option>
                    <option value="medium">{t('announcements.priority.medium')}</option>
                    <option value="high">{t('announcements.priority.high')}</option>
                  </select>
                </div>
              </div>

              {/* --- AANGEPAST: Knoppen flex-col-reverse op mobiel (opslaan bovenaan), flex-row rechts uitgelijnd op grotere schermen --- */}
              <div className="mt-4 md:mt-6 pt-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-end gap-2 md:gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-4 md:px-5 py-2 md:py-2.5 text-gray-500 font-semibold hover:bg-gray-50 rounded-xl text-sm md:text-base">
                  {t('general.cancelButton')}
                </button>
                <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-4 md:px-5 py-2 md:py-2.5 bg-[#0870C4] text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center gap-2 shadow-sm text-sm md:text-base">
                  {isSubmitting ? t('announcements.modal.buttonLoading') : (editingId ? t('announcements.modal.buttonUpdate') : t('announcements.modal.buttonCreate'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}