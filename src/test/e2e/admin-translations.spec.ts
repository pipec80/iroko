import { test as adminTest, expect } from './fixtures/platform-admin';

/** Real admin session verifies translated server and client surfaces in both locales. */
adminTest('FR/PT admin, impersonation, and activity messages render', async ({ platformAdmin }) => {
  const { page, targetId } = platformAdmin;

  for (const locale of ['fr', 'pt'] as const) {
    const labels =
      locale === 'fr' ?
        {
          accounts: 'Comptes',
          search: 'Rechercher par nom ou identifiant',
          announcement: 'Publier une annonce',
          impersonate: /^Voir en tant que /,
          activity: "Journal d'activité",
        }
      : {
          accounts: 'Contas',
          search: 'Buscar por nome ou identificador',
          announcement: 'Publicar anúncio',
          impersonate: /^Visualizar como /,
          activity: 'Registro de atividade',
        };

    await page.goto(`/${locale}/dashboard/admin/accounts`);
    await expect(page.getByRole('heading', { name: labels.accounts })).toBeVisible();
    await expect(page.getByPlaceholder(labels.search)).toBeVisible();

    await page.goto(`/${locale}/dashboard/admin/accounts/${targetId}`);
    await expect(page.getByRole('button', { name: labels.impersonate })).toBeVisible();

    await page.goto(`/${locale}/dashboard/admin/announcements`);
    await expect(page.getByRole('heading', { name: labels.announcement })).toBeVisible();

    await page.goto(`/${locale}/dashboard/activity`);
    await expect(page.getByRole('heading', { name: labels.activity })).toBeVisible();
  }
});
