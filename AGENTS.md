# CLAUDE.md — Terka

## Code Formatting & Quality

**SANGAT PENTING:** Jangan pernah men-disable atau mengabaikan linter/type checker (`// @ts-ignore`, `/* eslint-disable */`, dll) tanpa instruksi eksplisit dari user. Perbaiki kode agar sesuai dengan aturan linter.

Setelah Anda membuat, mengubah, atau menghapus kode, Anda **WAJIB** menjalankan perintah berikut untuk memastikan kualitas kode:

1. **Frontend:**
    ```bash
    bun run format
    bun run lint:fix
    bun run check
    ```

## Git Commits

**Wajib** menggunakan standar [Conventional Commits](https://www.conventionalcommits.org/) untuk setiap git commit. Jangan tambahkan deskripsi "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>".

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types yang Digunakan

| Type       | Kapan digunakan                                    |
| ---------- | -------------------------------------------------- |
| `feat`     | Fitur baru                                         |
| `fix`      | Bug fix                                            |
| `docs`     | Perubahan dokumentasi saja                         |
| `style`    | Perubahan format/whitespace, tidak mengubah logika |
| `refactor` | Refactoring kode, bukan fitur baru atau bug fix    |
| `test`     | Menambah atau mengubah tests                       |
| `chore`    | Maintenance: update deps, config, tooling          |
| `build`    | Perubahan build system atau external dependencies  |
| `ci`       | Perubahan CI/CD config                             |
| `perf`     | Peningkatan performa                               |

### Contoh

```bash
feat(auth): add login with google oauth
fix(dashboard): correct total revenue calculation
chore: update tailwindcss to v4.1
refactor(ui): extract button component from dashboard
```

### Aturan

- **Konfirmasi Sebelum Commit:** Setelah implementasi selesai dan tervalidasi, **SELALU** tanyakan konfirmasi ke user sebelum melakukan `git add` dan `git commit`. Jangan pernah commit tanpa persetujuan eksplisit dari user. Siapkan commit message yang sesuai Conventional Commits untuk ditinjau user sebelum dieksekusi.
- **Jangan tambahkan Co-Authored-By:** Tidak perlu menambahkan footer `Co-Authored-By: Claude Sonnet ...` pada pesan commit.
- **Selalu berbahasa Inggris:** Pesan commit ditulis dalam bahasa Inggris, meskipun percakapan berlangsung dalam bahasa Indonesia.
- **Tanpa body/description:** Cukup tulis baris subject saja. Buat subject yang jelas dan mewakili seluruh perubahan, sehingga _body_ tidak diperlukan. Tambahkan _body_ hanya jika user memintanya secara eksplisit.
- Gunakan huruf kecil untuk type dan description
- Description singkat, imperatif, tanpa titik di akhir
- Scope opsional, gunakan nama modul/area kode (misal: `auth`, `dashboard`, `ui`)
- Breaking changes: tambahkan `!` setelah type/scope, misal `feat!: remove legacy api`

## Superpowers — Plan Mode

### Alur Wajib

Setiap kali memasuki plan mode atau mengerjakan fitur baru, **wajib** mengikuti urutan berikut:

1. Gunakan skill `superpowers:brainstorming` terlebih dahulu untuk mengeksplorasi kebutuhan dan desain
2. Setelah brainstorming selesai, gunakan skill `superpowers:writing-plans` untuk membuat rencana implementasi terstruktur
3. Baru kemudian eksekusi plan

Jangan lewati langkah 1 atau 2, bahkan untuk task yang tampak sederhana.

### Output Location

Saat menggunakan skill perencanaan, simpan output ke folder berikut:

- **Specs:** `docs/superpowers/specs/YYYY-MM-DD-<feature-name>.md`
- **Plans:** `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`

Buat folder tersebut jika belum ada. Lokasi ini **menggantikan** default bawaan skill.

Saat men-dispatch subagent untuk eksekusi plan (skill `superpowers:subagent-driven-development` atau `superpowers:executing-plans`), gunakan `model: "sonnet"` pada setiap panggilan Agent tool.
