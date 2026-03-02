import { Models } from "react-native-appwrite";

export interface UserProfile extends Models.Document {
    email: string;
    full_name: string;
    role: 'citizen' | 'org_viewer' | 'org_officer' | 'org_admin' | 'super_admin';
    organization_id?: string; 
    current_points: number;
    lifetime_points: number;
    last_daily_spin?: string; 
    is_banned: boolean;
    device_id?: string;
    preferences?: string;
    avatar_url?: string;
}

export interface Organization extends Models.Document {
    name: string;
    logo_url?: string;
    contact_email?: string;
    zip_codes: string; 
    status: 'active' | 'blocked' | 'pending';
}

export interface Category extends Models.Document {
    name: string;           
    slug: string;           
    default_points: number;
    priority: 'low' | 'medium' | 'high';
    is_active: boolean;
    keywords: string[];
}

export interface Report extends Models.Document {
    description: string;
    photo_url: string;
    ai_detected_category?: string;
    ai_confidence?: number;
    category_id: string; 
    address?: string;
    city?: string;
    zip_code?: string;
    location_lat: number;
    location_long: number;
    status: 'New' | 'Approved' | 'In Progress' | 'Resolved' | 'Invalid';
    admin_notes?: string;
    is_duplicate: boolean;
    original_report_id?: string; 
    points_awarded?: number;
    user_id: string;       
    organization_id?: string; 
}

export interface Reward extends Models.Document {
    title: string;
    description: string;
    image_url: string;
    cost_points: number;
    business_name: string;
    valid_until?: string;
    type: 'voucher' | 'product' | 'donation';
    location_filter?: string;
    organization_id?: string;
    is_active: boolean;
}

export interface UserReward extends Models.Document {
    user_id: string;   
    reward_id: string; 
    code: string;      
    status: 'active' | 'used' | 'expired';
    redeemed_at?: string;
}


export interface Announcement extends Models.Document {
    title: string;
    content: string;
    start_at: string;
    ends_at: string;
    organization_id: string;
    priority: 'normal' | 'high';
    is_active: boolean;
}

export type CollectionName = 'profiles' | 'organizations' | 'categories' | 'reports' | 'rewards' | 'user_rewards' | 'announcements';