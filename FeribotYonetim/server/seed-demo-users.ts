import { storage } from './storage';
import SampleMemberDataService from './services/sample-member-data';
import { hashPassword } from './auth';

/**
 * Bu script, demo ve member kullanıcılarını veritabanına ekler ve
 * onlar için örnek veriler oluşturur
 */
export async function seedDemoUsers() {
  console.log("Demo ve member kullanıcıları oluşturuluyor...");
  
  // Demo kullanıcısı oluştur
  const demoUserExists = await storage.getUserByUsername("demo");
  
  if (!demoUserExists) {
    const demoPassword = await hashPassword("demo123");
    await storage.createUser({
      username: "demo",
      password: demoPassword,
      email: "demo@ferrybooking.com",
      fullName: "Demo Kullanıcı",
      role: "user",
      isActive: true,
      phoneNumber: "+905551234567",
      profileImage: "/assets/users/demo-profile.png"
    });
    console.log("Demo kullanıcısı oluşturuldu");
  } else {
    console.log("Demo kullanıcısı zaten mevcut");
  }
  
  // Member kullanıcısı oluştur
  const memberUserExists = await storage.getUserByUsername("member");
  
  if (!memberUserExists) {
    const memberPassword = await hashPassword("member123");
    await storage.createUser({
      username: "member",
      password: memberPassword,
      email: "member@ferrybooking.com",
      fullName: "Üye Kullanıcı",
      role: "user",
      isActive: true,
      phoneNumber: "+905557654321",
      profileImage: "/assets/users/member-profile.png"
    });
    console.log("Member kullanıcısı oluşturuldu");
  } else {
    console.log("Member kullanıcısı zaten mevcut");
  }
  
  // Demo ve member kullanıcıları için örnek veriler oluştur
  const sampleDataService = new SampleMemberDataService(storage);
  await sampleDataService.populateDemoData();
  
  console.log("Demo ve member kullanıcıları için örnek veriler oluşturuldu");
}

// ESM formatında doğrudan çalıştırılacak kod
// ES modules'da require.main === module kontrolü yerine aşağıdaki yaklaşım kullanılır
// Bu dosya import edildiğinde değil, doğrudan çalıştırıldığında seedDemoUsers çağrılır
// (Şu an zaten routes.ts içinden çağrılıyor)