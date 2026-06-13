-- AlterTable: ageRange -> age (exact years)
ALTER TABLE "User" ADD COLUMN "age" INTEGER;

UPDATE "User" SET "age" = CASE "ageRange"
  WHEN 'UNDER_18' THEN 17
  WHEN 'AGE_18_24' THEN 21
  WHEN 'AGE_25_34' THEN 30
  WHEN 'AGE_35_44' THEN 40
  WHEN 'AGE_45_54' THEN 50
  WHEN 'AGE_55_PLUS' THEN 60
  ELSE NULL
END
WHERE "ageRange" <> '';

UPDATE "User" SET "gender" = '' WHERE "gender" NOT IN ('MALE', 'FEMALE');

ALTER TABLE "User" DROP COLUMN "ageRange";
