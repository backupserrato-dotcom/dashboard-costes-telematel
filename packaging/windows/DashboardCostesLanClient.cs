using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Windows.Forms;

internal static class DashboardCostesLanClient
{
    private const string DefaultUrl = "http://192.168.1.57:3000";

    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        string root = AppDomain.CurrentDomain.BaseDirectory;
        string configPath = Path.Combine(root, "dashboard-url.txt");
        string dashboardUrl = ReadUrl(configPath);

        if (!IsDashboardReady(dashboardUrl))
        {
            MessageBox.Show(
                "No se pudo conectar con el Dashboard de Costes.\n\n" +
                "Dirección: " + dashboardUrl + "\n\n" +
                "Compruebe que este equipo está conectado a la red interna y que el servidor está encendido. " +
                "Puede cambiar la dirección editando dashboard-url.txt.",
                "Dashboard Costes",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning);
            return;
        }

        try
        {
            Process.Start(new ProcessStartInfo(dashboardUrl) { UseShellExecute = true });
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "El servidor responde, pero no se pudo abrir el navegador.\n\n" + ex.Message,
                "Dashboard Costes",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
    }

    private static string ReadUrl(string configPath)
    {
        try
        {
            if (!File.Exists(configPath)) return DefaultUrl;
            string value = File.ReadAllText(configPath).Trim().TrimEnd('/');
            Uri parsed;
            if (Uri.TryCreate(value, UriKind.Absolute, out parsed) &&
                (parsed.Scheme == Uri.UriSchemeHttp || parsed.Scheme == Uri.UriSchemeHttps))
            {
                return value;
            }
        }
        catch { }
        return DefaultUrl;
    }

    private static bool IsDashboardReady(string baseUrl)
    {
        try
        {
            var request = (HttpWebRequest)WebRequest.Create(baseUrl + "/api/health");
            request.Timeout = 4000;
            request.ReadWriteTimeout = 4000;
            using (var response = (HttpWebResponse)request.GetResponse())
            {
                return response.StatusCode == HttpStatusCode.OK;
            }
        }
        catch { return false; }
    }
}
