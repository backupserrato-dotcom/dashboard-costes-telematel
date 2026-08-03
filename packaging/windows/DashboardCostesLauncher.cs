using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

internal static class DashboardCostesLauncher
{
    private const string DashboardUrl = "http://localhost:3000";

    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        string root = AppDomain.CurrentDomain.BaseDirectory;
        string nodePath = Path.Combine(root, "runtime", "node.exe");
        string serverPath = Path.Combine(root, "server", "dbConnectorServer.js");

        if (!File.Exists(nodePath) || !File.Exists(serverPath))
        {
            MessageBox.Show(
                "El paquete está incompleto. Compruebe que las carpetas runtime y server estén junto al ejecutable.",
                "Dashboard Costes",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return;
        }

        if (!IsDashboardReady())
        {
            try
            {
                var startInfo = new ProcessStartInfo
                {
                    FileName = nodePath,
                    Arguments = "\"" + serverPath + "\"",
                    WorkingDirectory = root,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                Process.Start(startInfo);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "No se pudo iniciar el servidor incluido.\n\n" + ex.Message,
                    "Dashboard Costes",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                return;
            }

            for (int attempt = 0; attempt < 30 && !IsDashboardReady(); attempt++)
            {
                Thread.Sleep(500);
            }
        }

        if (!IsDashboardReady())
        {
            MessageBox.Show(
                "El servidor no respondió en el puerto 3000. Compruebe que el puerto esté libre y que el antivirus no haya bloqueado runtime\\node.exe.",
                "Dashboard Costes",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return;
        }

        try
        {
            Process.Start(new ProcessStartInfo(DashboardUrl) { UseShellExecute = true });
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "El dashboard está iniciado en " + DashboardUrl + ", pero no se pudo abrir el navegador.\n\n" + ex.Message,
                "Dashboard Costes",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
        }
    }

    private static bool IsDashboardReady()
    {
        try
        {
            var request = (HttpWebRequest)WebRequest.Create(DashboardUrl + "/api/health");
            request.Timeout = 1000;
            request.ReadWriteTimeout = 1000;
            using (var response = (HttpWebResponse)request.GetResponse())
            {
                return response.StatusCode == HttpStatusCode.OK;
            }
        }
        catch
        {
            return false;
        }
    }
}
