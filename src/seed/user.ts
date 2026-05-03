import { prisma } from "@/configs";
import bcrypt from "bcryptjs";

async function main() {
  const hashedPassword = await bcrypt.hash("Admin@123", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "admin@dekhoexam.com",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      phoneNumber: "+919876543210",
    },
  });

  console.log("✅ Admin created:", admin.email);
  console.log("📧 Email:", admin.email);
  console.log("🔑 Password:", "Admin@123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
