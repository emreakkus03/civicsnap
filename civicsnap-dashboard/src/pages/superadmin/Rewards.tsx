import React, { useState, useEffect, useRef } from "react";
import { databases, appwriteConfig, storage } from "@core/appwrite";
import { ID, Models } from "appwrite";
import { Plus, Edit, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import Header from "@components/Header";
import Sidebar from "@components/Sidebar";
import { useTranslation } from "react-i18next";

interface Reward extends Models.Document {
    title: string;
    description: string;
    image_url: string;
    cost_points: number;
    business_name: string;
    valid_until: string | null;
    type: string;
    location_filter: string;
    is_active: boolean;
}

const emptyForm = {
    title: "",
    description: "",
    image_url: "",
    cost_points: 0,
    business_name: "",
    valid_until: "",
    type: "discount",
    location_filter: "all",
    is_active: true,
};

export default function Rewards() {
    const { t } = useTranslation();
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingReward, setEditingReward] = useState<Reward | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [isSaving, setIsSaving] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchRewards = async () => {
        setLoading(true);
        try {
            const response = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.rewardsCollectionId,
            );
            const now = new Date();
            const processedRewards = await Promise.all(
                response.documents.map(async (doc: any) => {
                    if (doc.valid_until && new Date(doc.valid_until) < now && doc.is_active) {
                        await databases.updateDocument(
                            appwriteConfig.databaseId,
                            appwriteConfig.rewardsCollectionId,
                            doc.$id,
                            { is_active: false },
                        );
                        return { ...doc, is_active: false };
                    }
                    return doc;
                }),
            );
            setRewards(processedRewards as unknown as Reward[]);
        } catch (error) {
            toast.error(t("rewards.toast.fetchError"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRewards();
    }, []);

    const handleOpenCreate = () => {
        setForm(emptyForm);
        setEditingReward(null);
        setImagePreview("");
        setImageFile(null);
        setShowForm(true);
    };

    const handleOpenEdit = (reward: Reward) => {
        setForm({
            title: reward.title,
            description: reward.description,
            image_url: reward.image_url,
            cost_points: reward.cost_points,
            business_name: reward.business_name,
            valid_until: reward.valid_until ? reward.valid_until.split("T")[0] : "",
            type: reward.type,
            location_filter: reward.location_filter,
            is_active: reward.is_active,
        });
        setEditingReward(reward);
        setImagePreview("");
        setImageFile(null);
        setShowForm(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        let finalImageUrl = form.image_url;

        if (imageFile) {
            const uploaded = await storage.createFile(
                appwriteConfig.storageBucketId,
                ID.unique(),
                imageFile,
            );
            finalImageUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storageBucketId}/files/${uploaded.$id}/view?project=${appwriteConfig.projectId}`;
        }

        try {
            const payload = {
                title: form.title,
                description: form.description,
                image_url: finalImageUrl,
                cost_points: Number(form.cost_points),
                business_name: form.business_name,
                valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
                type: form.type,
                location_filter: form.location_filter,
                is_active: form.is_active,
            };

            if (editingReward) {
                await databases.updateDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.rewardsCollectionId,
                    editingReward.$id,
                    payload,
                );
                toast.success(t("rewards.toast.updateSuccess"));
            } else {
                await databases.createDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.rewardsCollectionId,
                    ID.unique(),
                    payload,
                );
                toast.success(t("rewards.toast.saveSuccess"));
            }

            setShowForm(false);
            setImageFile(null);
            setImagePreview("");
            fetchRewards();
        } catch (error) {
            toast.error(t("rewards.toast.saveError"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (reward: Reward) => {
        if (!window.confirm(t("rewards.toast.deleteConfirm", { title: reward.title }))) return;
        try {
            await databases.deleteDocument(
                appwriteConfig.databaseId,
                appwriteConfig.rewardsCollectionId,
                reward.$id,
            );
            toast.success(t("rewards.toast.deleteSuccess"));
            fetchRewards();
        } catch (error) {
            toast.error(t("rewards.toast.deleteError"));
        }
    };

    const handleToggleActive = async (reward: Reward) => {
        try {
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.rewardsCollectionId,
                reward.$id,
                { is_active: !reward.is_active },
            );
            setRewards((prev) =>
                prev.map((r) => r.$id === reward.$id ? { ...r, is_active: !r.is_active } : r),
            );
        } catch (error) {
            toast.error(t("rewards.toast.toggleError"));
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F7FA] font-inter">
            <Header />
            <div className="flex">
                <Sidebar activeItem="rewards" />
                <main className="flex-1 p-8">
                    <div className="max-w-6xl mx-auto">

                        {/* --- Header --- */}
                        <div className="flex justify-between items-center mb-8">
                            <h1 className="text-3xl font-bold text-gray-900">{t("rewards.title")}</h1>
                            <button
                                onClick={handleOpenCreate}
                                className="flex items-center gap-2 px-5 py-3 bg-[#0870C4] text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <Plus size={18} />
                                {t("rewards.addButton")}
                            </button>
                        </div>

                        {/* --- Rewards table --- */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            {loading ? (
                                <div className="p-10 text-center text-gray-500">{t("rewards.loading")}</div>
                            ) : rewards.length === 0 ? (
                                <div className="p-10 text-center text-gray-500">{t("rewards.empty")}</div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-gray-800 font-bold text-sm bg-gray-50">
                                            <th className="py-4 px-6">{t("rewards.table.image")}</th>
                                            <th className="py-4 px-6">{t("rewards.table.title")}</th>
                                            <th className="py-4 px-6">{t("rewards.table.business")}</th>
                                            <th className="py-4 px-6">{t("rewards.table.cost")}</th>
                                            <th className="py-4 px-6">{t("rewards.table.location")}</th>
                                            <th className="py-4 px-6">{t("rewards.table.validUntil")}</th>
                                            <th className="py-4 px-6">{t("rewards.table.active")}</th>
                                            <th className="py-4 px-6 text-center">{t("rewards.table.actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rewards.map((reward) => (
                                            <tr key={reward.$id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                                <td className="py-3 px-6">
                                                    {reward.image_url ? (
                                                        <img src={reward.image_url} alt={reward.title} className="w-14 h-14 rounded-xl object-cover border border-gray-100" />
                                                    ) : (
                                                        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                                                            {t("rewards.table.noPhoto")}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-6">
                                                    <p className="font-semibold text-gray-900">{reward.title}</p>
                                                    <p className="text-xs text-gray-400 line-clamp-1">{reward.description}</p>
                                                </td>
                                                <td className="py-3 px-6 text-gray-600">{reward.business_name}</td>
                                                <td className="py-3 px-6">
                                                    <span className="bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-full text-sm">
                                                        {reward.cost_points} 💎
                                                    </span>
                                                </td>
                                                <td className="py-3 px-6 text-gray-600">
                                                    {t(`rewards.form.locations.${reward.location_filter}`, { defaultValue: reward.location_filter })}
                                                </td>
                                                <td className="py-3 px-6 text-gray-600">
                                                    {reward.valid_until ? new Date(reward.valid_until).toLocaleDateString("nl-BE") : "—"}
                                                </td>
                                                <td className="py-3 px-6">
                                                    <button
                                                        onClick={() => handleToggleActive(reward)}
                                                        className={`w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none ${reward.is_active ? "bg-[#0F9D58]" : "bg-gray-300"}`}
                                                    >
                                                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform duration-300 ${reward.is_active ? "translate-x-6 left-[1px]" : "translate-x-0.5"}`} />
                                                    </button>
                                                </td>
                                                <td className="py-3 px-6">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => handleOpenEdit(reward)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                            <Edit size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(reward)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* --- Create/Edit Modal --- */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingReward ? t("rewards.form.titleEdit") : t("rewards.form.titleCreate")}
                            </h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-gray-700">{t("rewards.form.titleLabel")}</label>
                                    <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4]" required />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-gray-700">{t("rewards.form.businessLabel")}</label>
                                    <input type="text" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4]" required />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-semibold text-gray-700">{t("rewards.form.descriptionLabel")}</label>
                                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] resize-none h-24" required />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-semibold text-gray-700">{t("rewards.form.imageLabel")}</label>
                                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                                <div onClick={() => fileInputRef.current?.click()} className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-[#0870C4] transition-colors overflow-hidden">
                                    {imagePreview || form.image_url ? (
                                        <img src={imagePreview || form.image_url} alt="preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center text-gray-400">
                                            <Plus size={24} className="mx-auto mb-1" />
                                            <p className="text-sm">{t("rewards.form.imageUploadText")}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-gray-700">{t("rewards.form.costLabel")}</label>
                                    <input type="number" value={form.cost_points} onChange={(e) => setForm({ ...form, cost_points: Number(e.target.value) })} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4]" min={0} required />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-gray-700">{t("rewards.form.typeLabel")}</label>
                                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] bg-white">
                                        <option value="discount">{t("rewards.form.types.discount")}</option>
                                        <option value="free_product">{t("rewards.form.types.free_product")}</option>
                                        <option value="ticket">{t("rewards.form.types.ticket")}</option>
                                        <option value="voucher">{t("rewards.form.types.voucher")}</option>
                                        <option value="good_cause">{t("rewards.form.types.good_cause")}</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-gray-700">{t("rewards.form.locationLabel")}</label>
                                    <select value={form.location_filter} onChange={(e) => setForm({ ...form, location_filter: e.target.value })} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] bg-white">
                                        <option value="all">{t("rewards.form.locations.all")}</option>
                                        <option value="antwerp">{t("rewards.form.locations.antwerp")}</option>
                                        <option value="ghent">{t("rewards.form.locations.ghent")}</option>
                                        <option value="brussels">{t("rewards.form.locations.brussels")}</option>
                                        <option value="bruges">{t("rewards.form.locations.bruges")}</option>
                                        <option value="hasselt">{t("rewards.form.locations.hasselt")}</option>
                                        <option value="courtrai">{t("rewards.form.locations.courtrai")}</option>
                                        <option value="namur">{t("rewards.form.locations.namur")}</option>
                                        <option value="liege">{t("rewards.form.locations.liege")}</option>
                                        <option value="charleroi">{t("rewards.form.locations.charleroi")}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-gray-700">{t("rewards.form.validUntilLabel")}</label>
                                    <input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} min={new Date().toISOString().split("T")[0]} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4]" />
                                </div>
                                <div className="flex flex-col gap-1 justify-end">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <span className="text-sm font-semibold text-gray-700">{t("rewards.form.activeLabel")}</span>
                                        <div onClick={() => setForm({ ...form, is_active: !form.is_active })} className={`w-12 h-6 rounded-full relative transition-colors duration-300 cursor-pointer ${form.is_active ? "bg-[#0F9D58]" : "bg-gray-300"}`}>
                                            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform duration-300 ${form.is_active ? "translate-x-6 left-[1px]" : "translate-x-0.5"}`} />
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-4">
                                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors">
                                    {t("rewards.form.cancelButton")}
                                </button>
                                <button type="submit" disabled={isSaving} className="flex-1 py-3 rounded-xl bg-[#0870C4] text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                                    {isSaving ? t("rewards.form.savingButton") : editingReward ? t("rewards.form.updateButton") : t("rewards.form.saveButton")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}