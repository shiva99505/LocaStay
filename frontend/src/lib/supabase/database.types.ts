export type UserRole = 'TENANT' | 'LANDLORD' | 'ADMIN';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:           string;
          name:         string | null;
          email:        string;
          role:         UserRole;
          phone:        string | null;
          avatar:       string | null;
          is_verified:  boolean;
          is_suspended: boolean;
          language:     string;
          bio:          string | null;
          address:      string | null;
          city:         string | null;
          state:        string | null;
          kyc_status:   string;
          created_at:   string;
          updated_at:   string;
        };
        Insert: {
          id:            string;
          name?:         string | null;
          email:         string;
          role?:         UserRole;
          phone?:        string | null;
          avatar?:       string | null;
          is_verified?:  boolean;
          is_suspended?: boolean;
          language?:     string;
        };
        Update: {
          name?:         string | null;
          email?:        string;
          role?:         UserRole;
          phone?:        string | null;
          avatar?:       string | null;
          is_verified?:  boolean;
          is_suspended?: boolean;
          language?:     string;
          updated_at?:   string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id:         string;
          user_id:    string;
          type:       string;
          title:      string;
          message:    string;
          link:       string | null;
          is_read:    boolean;
          created_at: string;
        };
        Insert: {
          id?:        string;
          user_id:    string;
          type:       string;
          title:      string;
          message:    string;
          link?:      string | null;
          is_read?:   boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          id:                     string;
          landlord_id:            string;
          title:                  string;
          description:            string | null;
          type:                   string;
          status:                 string;
          rent:                   number;
          deposit:                number;
          address:                string;
          village:                string | null;
          city:                   string;
          district:               string | null;
          state:                  string;
          pincode:                string;
          latitude:               number;
          longitude:              number;
          cover_image:            string | null;
          images:                 string[];
          total_rooms:            number;
          occupied_rooms:         number;
          rating:                 number;
          review_count:           number;
          is_verified:            boolean;
          is_featured:            boolean;
          views:                  number;
          distance_to_school:     number | null;
          distance_to_hospital:   number | null;
          distance_to_college:    number | null;
          distance_to_market:     number | null;
          distance_to_bus_stand:  number | null;
          distance_to_railway:    number | null;
          distance_to_atm:        number | null;
          created_at:             string;
          updated_at:             string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      bookings: {
        Row: {
          id:              string;
          tenant_id:       string;
          property_id:     string;
          status:          string;
          move_in_date:    string;
          duration_months: number;
          message:         string | null;
          requested_at:    string;
          responded_at:    string | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      rent_payments: {
        Row: {
          id:          string;
          tenant_id:   string;
          property_id: string;
          period:      string;
          amount:      number;
          late_fee:    number;
          due_date:    string;
          paid_date:   string | null;
          status:      string;
          created_at:  string;
          updated_at:  string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      landlord_profiles: {
        Row: {
          id:                  string;
          user_id:             string;
          business_name:       string | null;
          verification_status: string;
          response_rate:       number;
          created_at:          string;
          updated_at:          string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      saved_properties: {
        Row: {
          id:          string;
          user_id:     string;
          property_id: string;
          created_at:  string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      reviews: {
        Row: {
          id:             string;
          property_id:    string;
          tenant_id:      string;
          rating:         number;
          comment:        string | null;
          landlord_reply: string | null;
          created_at:     string;
          updated_at:     string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      leads: {
        Row: {
          id:          string;
          landlord_id: string;
          property_id: string | null;
          tenant_id:   string | null;
          name:        string;
          phone:       string;
          message:     string | null;
          source:      string;
          status:      string;
          created_at:  string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      agreements: {
        Row: {
          id:                 string;
          tenant_id:          string;
          landlord_id:        string;
          property_id:        string;
          booking_id:         string | null;
          rent_amount:        number;
          deposit_amount:     number;
          start_date:         string;
          end_date:           string | null;
          status:             string;
          tenant_signed_at:   string | null;
          landlord_signed_at: string | null;
          created_at:         string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      support_tickets: {
        Row: {
          id:          string;
          user_id:     string;
          subject:     string;
          category:    string;
          description: string;
          status:      string;
          priority:    string;
          created_at:  string;
          updated_at:  string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      complaints: {
        Row: {
          id:          string;
          user_id:     string;
          property_id: string | null;
          category:    string;
          title:       string;
          description: string;
          status:      string;
          priority:    string;
          created_at:  string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
