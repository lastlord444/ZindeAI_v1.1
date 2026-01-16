# Verifikasyon Dokümantasyonu

## Sistem Nasıl Doğrulanır?

Sistem, `tests/seed/validate_seeds.ts` scripti ile veritabanındaki tüm yemek verilerini tarayarak aşağıdaki katı kuralları doğrular. Hata durumunda CI pipelini kırılır (exit code 1).

### 1. SQL Kuralları (View & Schema)
- **Strict View (`meal_totals`)**: `INNER JOIN` kullanıldığı için, eğer bir yemeğin içeriğindeki herhangi bir malzemenin makro verisi eksikse, o yemek **listelenmez**. Bu sayede eksik/hatalı hesaplamaların önüne geçilir. `COALESCE(..., 0)` kullanılmamıştır.
- **UUID**: Tüm tablolar `gen_random_uuid()` kullanır.

### 2. Hard Validator Kuralları (`validate_seeds.ts`)

#### A. Maliyet Sınırları (Cost Caps)
Her öğün tipi için belirlenen TL sınırları aşılırsa hata döner.
```typescript
const COST_CAPS = {
  "kahvalti": 60,
  "ara_ogun_1": 35,
  "ogle": 90, 
  ...
};
```
*Örnek Hata:* `❌ [Lüks Kahvaltı] Cost exceeded! 75.50 > 60 for kahvalti`

#### B. Sınıflandırma (Class Mapping)
DB'de `meal_type` ile `meal_class` uyuşmazlığı varsa hata döner.
*Örnek Hata:* `❌ [Yanlış Yemek] Wrong Class! Got main_meal, expected breakfast for kahvalti`

#### C. Alternatifler (Alternatives)
Her yemeğin `meal_alternatives` tablosunda kaydı olması, bu alternatiflerin `meal_totals` içinde bulunabilir olması ve kurallara uyması gerekir.
- **Kcal Farkı**: Ana yemek ile alternatifler arasında %15'ten fazla kcal farkı olamaz.
- **Protein Kaynağı**: Ana yemek ile alternatiflerin protein kaynağı (örn. 'chicken') aynı olamaz.

#### D. Makro Aralıkları (Macro Ranges)
Belirlenen `cut/bulk/maintain` hedeflerine göre min/max kalori kontrolü yapılır.

## Manual Test (SQL)

Aşağıdaki sorgularla sistemin davranışını manuel test edebilirsiniz:

```sql
-- 1. Eksik Macrosu Olan Yemeği Bul (View'da çıkmamalı)
SELECT m.name 
FROM meals m 
LEFT JOIN meal_totals mt ON m.id = mt.meal_id 
WHERE mt.meal_id IS NULL;

-- 2. Alternatifi Olmayan Yemekleri Bul
SELECT m.name 
FROM meals m 
LEFT JOIN meal_alternatives ma ON m.id = ma.meal_id 
WHERE ma.meal_id IS NULL;
```

### 3. Plan Slot Tutarlılığı (Plan Slot Enforcement)

`plan_items` tablosundaki `meal_type` kolonu, bir plan öğesi için hedeflenen öğün tipini (kahvaltı vb.) belirtir. Trigger, bu hedeflenen tip ile atanan yemeğin (`meals` tablosundaki) tipinin eşleşmesini zorunlu kılar.

**Test Senaryosu 1: HATA Beklenir**
Bir kahvaltı slotuna (meal_type='kahvalti') akşam yemeği (type='aksam') eklemeye çalışmak.
```sql
DO $$
DECLARE
    p_id uuid;
    m_id uuid; -- Aksam yemegi ID'si
BEGIN
    INSERT INTO plans (user_id) SELECT id FROM profiles LIMIT 1 RETURNING id INTO p_id;
    SELECT id INTO m_id FROM meals WHERE meal_type = 'aksam' LIMIT 1;
    
    INSERT INTO plan_items (plan_id, day_of_week, meal_id, meal_type)
    VALUES (p_id, 1, m_id, 'kahvalti'); -- HATA: Slot expected kahvalti, but meal ... is aksam
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ Basarili: Trigger hatasi yakalandi: %', SQLERRM;
END $$;
```

**Test Senaryosu 2: BAŞARI Beklenir**
Doğru eşleşme veya meal_type NULL (trigger pas geçilir).
```sql
-- Doğru eşleşme
INSERT INTO plan_items (..., meal_id, meal_type) VALUES (..., m_id, 'aksam'); -- OK
```
