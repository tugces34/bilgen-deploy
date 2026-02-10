const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// MEB müfredatına uygun detaylı ünite/konu yapısı (old.data.js'den alınmıştır)
const mathUnitsByGrade = {
  '1': [
    { name: '1. Ünite: Sayılar', konular: ['Doğal Sayılar', 'Sayı Örüntüleri', 'Toplama İşlemi', 'Çıkarma İşlemi'] },
    { name: '2. Ünite: Geometri', konular: ['Geometrik Cisimler', 'Geometrik Şekiller', 'Uzamsal İlişkiler'] },
    { name: '3. Ünite: Ölçme', konular: ['Uzunluk Ölçme', 'Zaman Ölçme', 'Tartma', 'Para'] }
  ],
  '2': [
    { name: '1. Ünite: Sayılar', konular: ['Doğal Sayılar', 'Toplama İşlemi', 'Çıkarma İşlemi', 'Çarpma İşlemi'] },
    { name: '2. Ünite: Geometri', konular: ['Geometrik Cisimler', 'Geometrik Şekiller', 'Örüntü ve Süslemeler'] },
    { name: '3. Ünite: Ölçme', konular: ['Uzunluk Ölçme', 'Çevre', 'Zaman Ölçme', 'Tartma'] }
  ],
  '3': [
    { name: '1. Ünite: Sayılar', konular: ['Doğal Sayılar', 'Toplama İşlemi', 'Çıkarma İşlemi', 'Çarpma İşlemi', 'Bölme İşlemi', 'Kesirler'] },
    { name: '2. Ünite: Geometri', konular: ['Geometrik Cisimler', 'Geometrik Şekiller', 'Örüntü ve Süslemeler'] },
    { name: '3. Ünite: Ölçme', konular: ['Uzunluk Ölçme', 'Çevre', 'Alan', 'Zaman Ölçme', 'Tartma', 'Sıvı Ölçme'] }
  ],
  '4': [
    { name: '1. Ünite: Sayılar', konular: ['Doğal Sayılar', 'Toplama İşlemi', 'Çıkarma İşlemi', 'Çarpma İşlemi', 'Bölme İşlemi', 'Kesirler', 'Ondalık Gösterim'] },
    { name: '2. Ünite: Geometri', konular: ['Geometrik Cisimler', 'Geometrik Şekiller', 'Örüntü ve Süslemeler', 'Simetri'] },
    { name: '3. Ünite: Ölçme', konular: ['Uzunluk Ölçme', 'Çevre ve Alan', 'Zaman Ölçme', 'Tartma', 'Sıvı Ölçme'] }
  ],
  '5': [
    { name: '1. Ünite: Sayılar', konular: ['Doğal Sayılar', 'Kesirler', 'Ondalık Gösterim', 'Yüzdeler'] },
    { name: '2. Ünite: Cebir', konular: ['Sayı ve Şekil Örüntüleri', 'Doğal Sayılarla İşlemler'] },
    { name: '3. Ünite: Geometri ve Ölçme', konular: ['Temel Geometrik Kavramlar', 'Üçgenler ve Dörtgenler', 'Uzunluk ve Zaman Ölçme', 'Alan Ölçme'] },
    { name: '4. Ünite: Veri İşleme', konular: ['Veri Toplama ve Değerlendirme', 'Tablo ve Grafikler'] },
    { name: '5. Ünite: Olasılık', konular: ['Olasılık'] }
  ],
  '6': [
    { name: '1. Ünite: Sayılar', konular: ['Doğal Sayılar', 'Tam Sayılar', 'Kesirlerle İşlemler', 'Ondalık Gösterim', 'Oran ve Orantı'] },
    { name: '2. Ünite: Cebir', konular: ['Cebirsel İfadeler', 'Eşitlik ve Denklem'] },
    { name: '3. Ünite: Geometri ve Ölçme', konular: ['Açılar', 'Alan Ölçme', 'Çember', 'Geometrik Cisimler'] },
    { name: '4. Ünite: Veri İşleme', konular: ['Veri Analizi', 'Tablo ve Grafikler'] },
    { name: '5. Ünite: Olasılık', konular: ['Olasılık'] }
  ],
  '7': [
    { name: '1. Ünite: Sayılar', konular: ['Tam Sayılar', 'Rasyonel Sayılar', 'Oran ve Orantı', 'Yüzdeler'] },
    { name: '2. Ünite: Cebir', konular: ['Cebirsel İfadeler', 'Eşitlik ve Denklem', 'Doğrusal Denklemler'] },
    { name: '3. Ünite: Geometri ve Ölçme', konular: ['Doğrular ve Açılar', 'Çokgenler', 'Çember ve Daire', 'Alan ve Hacim'] },
    { name: '4. Ünite: Veri İşleme', konular: ['Merkezi Eğilim ve Yayılım Ölçüleri', 'Grafikler'] },
    { name: '5. Ünite: Olasılık', konular: ['Olasılık'] }
  ],
  '8': [
    { name: '1. Ünite: Sayılar', konular: ['Kareköklü Sayılar', 'Üslü Sayılar', 'Standart Yazım'] },
    { name: '2. Ünite: Cebir', konular: ['Cebirsel İfadeler ve Özdeşlikler', 'Doğrusal Denklemler', 'Eşitsizlikler'] },
    { name: '3. Ünite: Geometri ve Ölçme', konular: ['Üçgenler', 'Eşlik ve Benzerlik', 'Dönüşüm Geometrisi', 'Geometrik Cisimler'] },
    { name: '4. Ünite: Veri İşleme', konular: ['Veri Analizi', 'Olayların Olma Olasılığı'] },
    { name: '5. Ünite: Olasılık', konular: ['Olasılık', 'Sayma'] }
  ]
};

const turkishUnitsByGrade = {
  '1': [
    { name: '1. Ünite: Okuma', konular: ['Harf Tanıma', 'Hece Oluşturma', 'Kelime Okuma', 'Sesli Okuma'] },
    { name: '2. Ünite: Yazma', konular: ['Harf Yazma', 'Kelime Yazma', 'Cümle Yazma', 'Yazım Kuralları'] },
    { name: '3. Ünite: Dinleme/İzleme', konular: ['Dikkatli Dinleme', 'Anladığını Söyleme', 'Yönerge Takip Etme'] },
    { name: '4. Ünite: Konuşma', konular: ['Kendini Tanıtma', 'Düzgün Konuşma', 'Sözcük Dağarcığı'] }
  ],
  '2': [
    { name: '1. Ünite: Okuma', konular: ['Akıcı Okuma', 'Okuduğunu Anlama', 'Sesli ve Sessiz Okuma'] },
    { name: '2. Ünite: Yazma', konular: ['Düzgün Yazma', 'Noktalama İşaretleri', 'Yazım Kuralları'] },
    { name: '3. Ünite: Dinleme/İzleme', konular: ['Hikaye Dinleme', 'Ana Fikri Bulma', 'Detayları Hatırlama'] },
    { name: '4. Ünite: Konuşma', konular: ['Hikaye Anlatma', 'Düşünce Belirtme', 'Sorular Sorma'] }
  ],
  '3': [
    { name: '1. Ünite: Okuma', konular: ['Hızlı Okuma', 'Anlayarak Okuma', 'Metni Çözümleme'] },
    { name: '2. Ünite: Yazma', konular: ['Yaratıcı Yazma', 'Metin Türleri', 'Dil Bilgisi'] },
    { name: '3. Ünite: Dinleme/İzleme', konular: ['Eleştirel Dinleme', 'Not Alma', 'Özet Çıkarma'] },
    { name: '4. Ünite: Konuşma', konular: ['Sunum Yapma', 'Tartışma', 'Görüş Bildirme'] }
  ],
  '4': [
    { name: '1. Ünite: Okuma', konular: ['Etkili Okuma', 'Metin Analizi', 'Karşılaştırma'] },
    { name: '2. Ünite: Yazma', konular: ['Planlı Yazma', 'Metin Düzenleme', 'Dil ve Anlatım'] },
    { name: '3. Ünite: Dinleme/İzleme', konular: ['Yorumlama', 'Değerlendirme', 'Soru-Cevap'] },
    { name: '4. Ünite: Konuşma', konular: ['Etkili İletişim', 'İkna Etme', 'Empati Kurma'] }
  ],
  '5': [
    { name: '1. Ünite: Okuma', konular: ['Eleştirel Okuma', 'Çıkarım Yapma', 'Metinler Arası Okuma'] },
    { name: '2. Ünite: Yazma', konular: ['Bilgilendirici Yazma', 'Hikaye Yazma', 'Şiir Yazma'] },
    { name: '3. Ünite: Dinleme/İzleme', konular: ['Medya Metinleri', 'Görsel-İşitsel Medya', 'Eleştirel İzleme'] },
    { name: '4. Ünite: Konuşma', konular: ['Hazırlıklı Konuşma', 'Röportaj', 'Panel Tartışması'] }
  ],
  '6': [
    { name: '1. Ünite: Okuma', konular: ['Hızlı ve Etkili Okuma', 'Metin Türlerini Tanıma', 'Araştırma Teknikleri'] },
    { name: '2. Ünite: Yazma', konular: ['Deneme Yazma', 'Makale Yazma', 'Yaratıcı Yazma'] },
    { name: '3. Ünite: Dinleme/İzleme', konular: ['Konferans Dinleme', 'Belgesel İzleme', 'Haber Programları'] },
    { name: '4. Ünite: Konuşma', konular: ['Münazara', 'Söylev', 'Dramatizasyon'] }
  ],
  '7': [
    { name: '1. Ünite: Okuma', konular: ['Akademik Okuma', 'Kaynak Tarama', 'Metin Özetleme'] },
    { name: '2. Ünite: Yazma', konular: ['Akademik Yazma', 'Rapor Yazma', 'Öykü Yazma'] },
    { name: '3. Ünite: Dinleme/İzleme', konular: ['Sempozyum Dinleme', 'Tiyatro İzleme', 'Müze Gezisi'] },
    { name: '4. Ünite: Konuşma', konular: ['Bilimsel Sunum', 'Proje Tanıtımı', 'Grup Çalışması'] }
  ],
  '8': [
    { name: '1. Ünite: Okuma', konular: ['Araştırma Okuma', 'Karşılaştırmalı Okuma', 'Eleştiri Yazma'] },
    { name: '2. Ünite: Yazma', konular: ['Tez Yazma', 'Eleştiri Yazma', 'Gazete Yazısı'] },
    { name: '3. Ünite: Dinleme/İzleme', konular: ['Uluslararası Programlar', 'Kültürlerarası İletişim'] },
    { name: '4. Ünite: Konuşma', konular: ['Liderlik Konuşması', 'Medya İletişimi', 'Kriz İletişimi'] }
  ]
};

const scienceUnitsByGrade = {
  '1': [
    { name: '1. Ünite: Canlılar Dünyası', konular: ['Canlı-Cansız Ayrımı', 'Hayvanlar', 'Bitkiler', 'İnsan Vücudu'] },
    { name: '2. Ünite: Kuvvet ve Hareket', konular: ['İtme-Çekme', 'Hızlı-Yavaş', 'Hareket Türleri'] },
    { name: '3. Ünite: Madde ve Değişim', konular: ['Katı-Sıvı-Gaz', 'Renk Değişimi', 'Şekil Değişimi'] },
    { name: '4. Ünite: Dünya ve Evren', konular: ['Gece-Gündüz', 'Mevsimler', 'Hava Durumu'] }
  ],
  '2': [
    { name: '1. Ünite: Canlılar Dünyası', konular: ['Hayvan Grupları', 'Bitki Bölümleri', 'İnsanın Temel İhtiyaçları'] },
    { name: '2. Ünite: Kuvvet ve Hareket', konular: ['Kuvvetin Etkileri', 'Sürtünme', 'Mıknatıslar'] },
    { name: '3. Ünite: Madde ve Değişim', konular: ['Maddelerin Özellikleri', 'Hal Değişimi', 'Karışımlar'] },
    { name: '4. Ünite: Dünya ve Evren', konular: ['Dünya\'nın Şekli', 'Ay\'ın Halleri', 'Yıldızlar'] }
  ],
  '3': [
    { name: '1. Ünite: Canlılar Dünyası', konular: ['Habitat', 'Besin Zinciri', 'Çevre Koruma'] },
    { name: '2. Ünite: Kuvvet ve Hareket', konular: ['Basınç', 'Yüzme-Batma', 'Elektrik'] },
    { name: '3. Ünite: Madde ve Değişim', konular: ['Çözünme', 'Yanma', 'Paslanma'] },
    { name: '4. Ünite: Dünya ve Evren', konular: ['Güneş Sistemi', 'Gezegenler', 'Uzay Araştırmaları'] }
  ],
  '4': [
    { name: '1. Ünite: Canlılar Dünyası', konular: ['Ekosistem', 'Biyoçeşitlilik', 'Nesli Tükenen Canlılar'] },
    { name: '2. Ünite: Kuvvet ve Hareket', konular: ['Basit Makineler', 'Enerji', 'Işık ve Ses'] },
    { name: '3. Ünite: Madde ve Değişim', konular: ['Kimyasal Değişim', 'Asit-Baz', 'Metal-Ametal'] },
    { name: '4. Ünite: Dünya ve Evren', konular: ['Dünya\'nın Hareketleri', 'İklim', 'Doğal Afetler'] }
  ],
  '5': [
    { name: '1. Ünite: Canlılar ve Hayat', konular: ['Hücre', 'Vücudumuzun Bilmecesini Çözelim', 'Kuvvetin Büyüklüğünün Ölçülmesi'] },
    { name: '2. Ünite: Madde ve Değişim', konular: ['Maddenin Değişimi', 'Işığın Yayılması', 'Ses ve Özellikleri'] },
    { name: '3. Ünite: Fiziksel Olaylar', konular: ['Kuvvetin Ölçülmesi', 'Sürtünme Kuvveti', 'Elektrik Devresi'] },
    { name: '4. Ünite: Dünya ve Evren', konular: ['Güneş Sistemi ve Tutulmalar', 'Dünya\'nın Katmanları'] }
  ],
  '6': [
    { name: '1. Ünite: Canlılar ve Hayat', konular: ['Hücre ve Bölünmeler', 'Vücudumuzda Sistemler', 'Kalıtım'] },
    { name: '2. Ünite: Madde ve Değişim', konular: ['Madde ve Isı', 'Maddenin Tanecikli Yapısı', 'Saf Madde ve Karışım'] },
    { name: '3. Ünite: Fiziksel Olaylar', konular: ['Işığın Soğurulması', 'Elektrik Enerjisi', 'Ses Teknolojileri'] },
    { name: '4. Ünite: Dünya ve Evren', konular: ['Güneş Sistemi ve Ötesi', 'Yer Kabuğu ve Hareketleri'] }
  ],
  '7': [
    { name: '1. Ünite: Canlılar ve Hayat', konular: ['Hücre ve Bölünmeler', 'Canlılarda Üreme, Büyüme, Gelişme', 'Kalıtım ve Çevre'] },
    { name: '2. Ünite: Madde ve Değişim', konular: ['Atom ve Periyodik Sistem', 'Kimyasal Tepkimeler', 'Elektrik Yükleri'] },
    { name: '3. Ünite: Fiziksel Olaylar', konular: ['Işığın Maddeyle Etkileşimi', 'Elektrik Enerjisi', 'Aynalar ve Mercekler'] },
    { name: '4. Ünite: Dünya ve Evren', konular: ['Güneş Sistemi ve Uzay Bilimi', 'Yer Kabuğu ve Jeoloji'] }
  ],
  '8': [
    { name: '1. Ünite: Canlılar ve Hayat', konular: ['Hücre Bölünmesi ve Kalıtım', 'DNA ve Genetik Kod', 'Canlılarda Enerji Dönüşümleri'] },
    { name: '2. Ünite: Madde ve Değişim', konular: ['Kimyasal Tepkimeler', 'Asitler ve Bazlar', 'Kimya ve Enerji'] },
    { name: '3. Ünite: Fiziksel Olaylar', konular: ['Basınç', 'Elektrostatik', 'Elektrik Akımı ve Magnetizma'] },
    { name: '4. Ünite: Dünya ve Evren', konular: ['Mevsimler ve İklim', 'Çevre Bilimi', 'Fen ve Mühendislik'] }
  ]
};

const geographyUnitsByGrade = {
  '1': [
    { name: '1. Ünite: Yakın Çevremiz', konular: ['Evimiz', 'Okulumuz', 'Mahallemiz', 'Yön Kavramı'] },
    { name: '2. Ünite: Doğa', konular: ['Mevsimler', 'Hava Durumu', 'Gece Gündüz'] },
    { name: '3. Ünite: Yaşadığımız Yerler', konular: ['Köy', 'Şehir', 'Farklı Yerleşim Yerleri'] }
  ],
  '2': [
    { name: '1. Ünite: Yaşadığımız Yer', konular: ['İlimiz', 'Ülkemiz', 'Komşu Ülkeler'] },
    { name: '2. Ünite: Doğal Çevre', konular: ['Dağlar', 'Ovalar', 'Nehirler', 'Göller'] },
    { name: '3. Ünite: İnsan ve Çevre', konular: ['Çevre Temizliği', 'Doğayı Koruma', 'Geri Dönüşüm'] }
  ],
  '3': [
    { name: '1. Ünite: Dünyamız', konular: ['Kıtalar', 'Okyanuslar', 'Türkiye\'nin Yeri'] },
    { name: '2. Ünite: İklim', konular: ['Sıcaklık', 'Yağış', 'Rüzgar', 'Mevsimsel Değişimler'] },
    { name: '3. Ünite: Yerleşim', konular: ['Köy-Şehir Karşılaştırması', 'Nüfus', 'Göç'] }
  ],
  '4': [
    { name: '1. Ünite: Konum ve Harita', konular: ['Harita Okuma', 'Pusula', 'GPS', 'Koordinat Sistemi'] },
    { name: '2. Ünite: Fiziki Coğrafya', konular: ['Yeryüzü Şekilleri', 'İç Kuvvetler', 'Dış Kuvvetler'] },
    { name: '3. Ünite: Beşeri Coğrafya', konular: ['Nüfus Dağılımı', 'Ekonomik Faaliyetler', 'Ulaşım'] }
  ],
  '5': [
    { name: '1. Ünite: Harita Bilgisi', konular: ['Harita Çeşitleri', 'Ölçek', 'Yön ve Konum'] },
    { name: '2. Ünite: Türkiye\'nin Fiziki Coğrafyası', konular: ['Coğrafi Konumu', 'Yeryüzü Şekilleri', 'İklim'] },
    { name: '3. Ünite: Türkiye\'nin Beşeri Coğrafyası', konular: ['Nüfus Özellikleri', 'Göç', 'Kültür'] }
  ],
  '6': [
    { name: '1. Ünite: Yeryüzünde Yaşam', konular: ['Dünya\'nın Şekli ve Hareketleri', 'Kıtalar ve Okyanuslar'] },
    { name: '2. Ünite: İklim ve Doğal Ortamlar', konular: ['İklim Türleri', 'Bitki Örtüsü', 'Ekosistemler'] },
    { name: '3. Ünite: Ülkemizin Coğrafyası', konular: ['Coğrafi Bölgeler', 'Su Varlığı', 'Bitki ve Hayvan Varlığı'] }
  ],
  '7': [
    { name: '1. Ünite: Türkiye\'nin Coğrafi Bölgeleri', konular: ['Marmara Bölgesi', 'Ege Bölgesi', 'Akdeniz Bölgesi', 'İç Anadolu Bölgesi'] },
    { name: '2. Ünite: Nüfus ve Yerleşme', konular: ['Nüfus Artışı', 'Nüfus Yoğunluğu', 'Şehirleşme'] },
    { name: '3. Ünite: Ekonomik Coğrafya', konular: ['Tarım', 'Hayvancılık', 'Sanayi', 'Ticaret'] }
  ],
  '8': [
    { name: '1. Ünite: Dünya Coğrafyası', konular: ['Kıtaların Genel Özellikleri', 'İklim Kuşakları', 'Doğal Kaynaklar'] },
    { name: '2. Ünite: Çevre Sorunları', konular: ['Hava Kirliliği', 'Su Kirliliği', 'Küresel Isınma'] },
    { name: '3. Ünite: Küresel Bağlantılar', konular: ['Uluslararası Ticaret', 'Göç Hareketleri', 'Kültürel Etkileşim'] }
  ]
};

// Ders ismine göre ünite yapısını döndüren yardımcı fonksiyon
function getUnitsForSubject(subjectName, grade) {
  const gradeStr = grade.toString();
  switch(subjectName) {
    case 'Matematik':
      return mathUnitsByGrade[gradeStr] || [];
    case 'Türkçe':
      return turkishUnitsByGrade[gradeStr] || [];
    case 'Fen Bilimleri':
      return scienceUnitsByGrade[gradeStr] || [];
    case 'Coğrafya':
      return geographyUnitsByGrade[gradeStr] || [];
    default:
      return [];
  }
}

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  try {
    await prisma.homework.deleteMany();
    await prisma.exam.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.generatedImage.deleteMany();
    await prisma.promptTemplate.deleteMany();
    await prisma.subject.deleteMany();
    console.log('✅ Cleaned existing data');
  } catch (error) {
    console.error('\n❌ Error clearing existing data.');
    console.error('This usually happens if the database tables do not exist yet.');
    console.error('👉 Please run "npm run prisma:migrate" to create the database tables first.\n');
    throw error;
  }

  // ========== Create Roles ==========
  const adminRole = await prisma.role.create({
    data: {
      name: 'ADMIN',
      description: 'Full system access'
    }
  });


  const teacherRole = await prisma.role.create({
    data: {
      name: 'TEACHER',
      description: 'Can create exams and assign homework'
    }
  });

  const studentRole = await prisma.role.create({
    data: {
      name: 'STUDENT',
      description: 'Can view and submit homework'
    }
  });

  console.log('✅ Created roles (including TEACHER and STUDENT)');

  // ========== Create Users ==========
  async function createUserWithRoles(email, password, name, roles) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      }
    });

    // Assign roles
    for (const role of roles) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id }
      });
    }

    return user;
  }

  await createUserWithRoles(
    'admin@bilgen.com',
    'admin123',
    'Admin User',
    [adminRole, teacherRole]
  );

  // Create teacher user
  await createUserWithRoles(
    'teacher@bilgen.com',
    'teacher123',
    'Öğretmen Ahmet',
    [teacherRole]
  );

  // Create student users
  await createUserWithRoles(
    'student1@bilgen.com',
    'student123',
    'Öğrenci Ayşe',
    [studentRole]
  );

  await createUserWithRoles(
    'student2@bilgen.com',
    'student123',
    'Öğrenci Mehmet',
    [studentRole]
  );

  await createUserWithRoles(
    'student3@bilgen.com',
    'student123',
    'Öğrenci Zeynep',
    [studentRole]
  );

  console.log('✅ Created users (password format: {role}123)');

  // ========== Create Subjects with Detailed Topics ==========
  console.log('📚 Creating detailed curriculum subjects...');
  let subjectCount = 0;

  // Matematik
  for (let grade = 1; grade <= 8; grade++) {
    const units = getUnitsForSubject('Matematik', grade);
    for (const unit of units) {
      for (const topic of unit.konular) {
        await prisma.subject.create({
          data: {
            name: 'Matematik',
            grade: grade,
            unit: unit.name,
            topic: topic,
            outcome: null
          }
        });
        subjectCount++;
      }
    }
  }

  // Türkçe
  for (let grade = 1; grade <= 8; grade++) {
    const units = getUnitsForSubject('Türkçe', grade);
    for (const unit of units) {
      for (const topic of unit.konular) {
        await prisma.subject.create({
          data: {
            name: 'Türkçe',
            grade: grade,
            unit: unit.name,
            topic: topic,
            outcome: null
          }
        });
        subjectCount++;
      }
    }
  }

  // Fen Bilimleri
  for (let grade = 1; grade <= 8; grade++) {
    const units = getUnitsForSubject('Fen Bilimleri', grade);
    for (const unit of units) {
      for (const topic of unit.konular) {
        await prisma.subject.create({
          data: {
            name: 'Fen Bilimleri',
            grade: grade,
            unit: unit.name,
            topic: topic,
            outcome: null
          }
        });
        subjectCount++;
      }
    }
  }

  // Coğrafya
  for (let grade = 1; grade <= 8; grade++) {
    const units = getUnitsForSubject('Coğrafya', grade);
    for (const unit of units) {
      for (const topic of unit.konular) {
        await prisma.subject.create({
          data: {
            name: 'Coğrafya',
            grade: grade,
            unit: unit.name,
            topic: topic,
            outcome: null
          }
        });
        subjectCount++;
      }
    }
  }

  console.log(`✅ Created ${subjectCount} subject entries with topics`);

  // ========== Create Sample Subjects with Outcomes ==========
  const mathSample = await prisma.subject.create({
    data: {
      name: 'Matematik',
      grade: 3,
      unit: '1. Ünite: Sayılar',
      topic: 'Doğal Sayılar',
      outcome: 'Öğrenci, doğal sayıları tanır ve kullanır'
    }
  });

  const scienceSample = await prisma.subject.create({
    data: {
      name: 'Fen Bilimleri',
      grade: 5,
      unit: '1. Ünite: Canlılar ve Hayat',
      topic: 'Vücudumuzun Bilmecesini Çözelim',
      outcome: 'Vücut sistemlerinin görevlerini açıklar'
    }
  });

  const turkishSample = await prisma.subject.create({
    data: {
      name: 'Türkçe',
      grade: 4,
      unit: '1. Ünite: Okuma',
      topic: 'Etkili Okuma',
      outcome: 'Metni anlayarak okur'
    }
  });

  const geographySample = await prisma.subject.create({
    data: {
      name: 'Coğrafya',
      grade: 6,
      unit: '2. Ünite: İklim ve Doğal Ortamlar',
      topic: 'İklim Türleri',
      outcome: 'İklim türlerini ve özelliklerini açıklar'
    }
  });

  console.log('✅ Created sample subjects with full details');

  // ========== Create Prompt Templates ==========
  const templates = await Promise.all([
    prisma.promptTemplate.create({
      data: {
        templateText: '{{sınıf}}. sınıf {{konu}} konusu için eğitici ve renkli bir illüstrasyon',
        variables: JSON.stringify(['sınıf', 'konu']),
        description: 'Genel eğitici görsel şablonu',
        subjectId: mathSample.id
      }
    }),
    prisma.promptTemplate.create({
      data: {
        templateText: '{{kazanım}} kazanımını anlatan çocuk dostu, basit çizim',
        variables: JSON.stringify(['kazanım']),
        description: 'Kazanım odaklı görsel',
        subjectId: scienceSample.id
      }
    }),
    prisma.promptTemplate.create({
      data: {
        templateText: '{{ünite}} ünitesi için {{sınıf}}. sınıf seviyesinde görsel materyal',
        variables: JSON.stringify(['ünite', 'sınıf']),
        description: 'Ünite kapağı görseli',
        subjectId: turkishSample.id
      }
    }),
    prisma.promptTemplate.create({
      data: {
        templateText: '{{ders}} dersi için,\n{{sınıf}}. sınıf seviyesinde,\n{{ünite}} ünitesi,\n{{konu}} konusu ve\n{{kazanım}} kazanımını destekleyen\nwatercolor (suluboya) tarzında illüstrasyon.',
        variables: JSON.stringify(['ders', 'sınıf', 'ünite', 'konu', 'kazanım']),
        description: 'Suluboya tarzı detaylı şablon',
        subjectId: null
      }
    }),
    prisma.promptTemplate.create({
      data: {
        templateText: '{{ders}} dersi kapsamında,\n{{sınıf}}. sınıf düzeyinde,\n{{konu}} kelimelerini temsil eden görsel sahne.',
        variables: JSON.stringify(['ders', 'sınıf', 'konu']),
        description: 'Görsel sahne şablonu',
        subjectId: geographySample.id
      }
    })
  ]);

  console.log(`✅ Created ${templates.length} prompt templates`);

  // ========== Summary ==========
  console.log('\n🎉 Seeding completed successfully!');
  console.log('\n📝 Test Users:');
  console.log('   Admin:     admin@bilgen.com / admin123');
  console.log('   Teacher:   teacher@bilgen.com / teacher123');
  console.log('   Student 1: student1@bilgen.com / student123');
  console.log('   Student 2: student2@bilgen.com / student123');
  console.log('   Student 3: student3@bilgen.com / student123');
  console.log('\n📚 Detailed Curriculum Structure (old.data.js integrated):');
  console.log('   Matematik:');
  console.log('     - 1-4. Sınıf: 3 ünite (Sayılar, Geometri, Ölçme) her sınıf için detaylı konular');
  console.log('     - 5-8. Sınıf: 5 ünite (Sayılar, Cebir, Geometri ve Ölçme, Veri İşleme, Olasılık)');
  console.log('   Türkçe:');
  console.log('     - 1-8. Sınıf: 4 ünite (Okuma, Yazma, Dinleme/İzleme, Konuşma) her sınıf için detaylı konular');
  console.log('   Fen Bilimleri:');
  console.log('     - 1-8. Sınıf: 4 ünite (Canlılar Dünyası, Kuvvet ve Hareket, Madde ve Değişim, Dünya ve Evren)');
  console.log('   Coğrafya:');
  console.log('     - 1-8. Sınıf: 3 ünite her sınıf için detaylı konular ile');
  console.log(`\n📊 Total subject entries: ${subjectCount + 4} (with detailed topics from old.data.js)`);
  console.log('✨ Now units and topics are available for dropdown selections!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
