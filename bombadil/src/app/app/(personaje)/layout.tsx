import { ProfileTabs } from "@/components/profile-tabs";

/** Everything about you lives under Personaje: the character, your health record, devices and your data. */
export default function PersonajeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ProfileTabs />
      {children}
    </>
  );
}
