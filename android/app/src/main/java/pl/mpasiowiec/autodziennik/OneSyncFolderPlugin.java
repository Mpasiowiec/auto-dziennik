package pl.mpasiowiec.autodziennik;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import androidx.documentfile.provider.DocumentFile;
import android.net.Uri;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "OneSyncFolder")
public class OneSyncFolderPlugin extends Plugin {

    private static final String PREFS_NAME = "one_sync_folder_preferences";
    private static final String KEY_TREE_URI = "tree_uri";
    private static final String DATA_DIRECTORY = "data";
    private static final String ATTACHMENTS_DIRECTORY = "attachments";
    private static final String BACKUPS_DIRECTORY = "backups";
    private static final String DATA_FILE_NAME = "data.json";

    private ActivityResultLauncher<Intent> folderPickerLauncher;
    private PluginCall pendingCall;

    @Override
    public void load() {
        folderPickerLauncher = getActivity().registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            new ActivityResultCallback<ActivityResult>() {
                @Override
                public void onActivityResult(ActivityResult result) {
                    handleFolderPickerResult(result);
                }
            }
        );
    }

    @PluginMethod
    public void selectFolder(PluginCall call) {
        pendingCall = call;

        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
        );

        folderPickerLauncher.launch(intent);
    }

    @PluginMethod
    public void getFolderStatus(PluginCall call) {
        SharedPreferences preferences = getContext().getSharedPreferences(
            PREFS_NAME,
            Activity.MODE_PRIVATE
        );

        String treeUri = preferences.getString(KEY_TREE_URI, null);

        JSObject result = new JSObject();
        result.put("selected", treeUri != null && !treeUri.isEmpty());
        result.put("treeUri", treeUri);

        call.resolve(result);
    }

    @PluginMethod
    public void clearFolder(PluginCall call) {
        SharedPreferences preferences = getContext().getSharedPreferences(
            PREFS_NAME,
            Activity.MODE_PRIVATE
        );

        String treeUri = preferences.getString(KEY_TREE_URI, null);

        if (treeUri != null && !treeUri.isEmpty()) {
            try {
                getContext().getContentResolver().releasePersistableUriPermission(
                    Uri.parse(treeUri),
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                        | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                );
            } catch (Exception ignored) {
                // Zgoda mogła zostać już cofnięta przez system.
            }
        }

        preferences.edit().remove(KEY_TREE_URI).apply();

        JSObject result = new JSObject();
        result.put("selected", false);
        result.put("treeUri", null);

        call.resolve(result);
    }

    @PluginMethod
    public void checkFolderAccess(PluginCall call) {
        SharedPreferences preferences = getContext().getSharedPreferences(
            PREFS_NAME,
            Activity.MODE_PRIVATE
        );

        String treeUri = preferences.getString(KEY_TREE_URI, null);
        boolean accessible = false;

        if (treeUri != null && !treeUri.isEmpty()) {
            try {
                Uri uri = Uri.parse(treeUri);

                for (android.content.UriPermission permission :
                    getContext().getContentResolver().getPersistedUriPermissions()) {

                    if (permission.getUri().equals(uri)
                        && permission.isReadPermission()
                        && permission.isWritePermission()) {
                        accessible = true;
                        break;
                    }
                }
            } catch (Exception ignored) {
                accessible = false;
            }
        }

        JSObject result = new JSObject();
        result.put("selected", treeUri != null && !treeUri.isEmpty());
        result.put("accessible", accessible);
        result.put("treeUri", treeUri);

        call.resolve(result);
    }

    @PluginMethod
    public void initializeStorage(PluginCall call) {
        try {
            DocumentFile rootFolder = getSelectedRootFolder();

            if (rootFolder == null || !rootFolder.canWrite()) {
                call.reject(
                    "Brak dostępu do wybranego folderu. Wybierz folder OneSync ponownie."
                );
                return;
            }

            DocumentFile dataFolder = getOrCreateDirectory(rootFolder, DATA_DIRECTORY);
            DocumentFile attachmentsFolder = getOrCreateDirectory(
                rootFolder,
                ATTACHMENTS_DIRECTORY
            );
            DocumentFile backupsFolder = getOrCreateDirectory(
                rootFolder,
                BACKUPS_DIRECTORY
            );

            if (dataFolder == null || attachmentsFolder == null || backupsFolder == null) {
                call.reject("Nie udało się utworzyć wymaganych katalogów w folderze OneSync.");
                return;
            }

            DocumentFile dataFile = dataFolder.findFile(DATA_FILE_NAME);
            boolean dataFileCreated = false;

            if (dataFile == null) {
                dataFile = dataFolder.createFile("application/json", DATA_FILE_NAME);

                if (dataFile == null) {
                    call.reject("Nie udało się utworzyć pliku data/data.json.");
                    return;
                }

                String initialJson = "{\n"
                    + "  \"schemaVersion\": 1,\n"
                    + "  \"createdAt\": \"" + System.currentTimeMillis() + "\",\n"
                    + "  \"source\": \"Auto Dziennik\"\n"
                    + "}";

                writeTextToDocument(dataFile, initialJson);
                dataFileCreated = true;
            }

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("dataFileCreated", dataFileCreated);
            result.put("rootUri", rootFolder.getUri().toString());
            result.put("dataFolderUri", dataFolder.getUri().toString());
            result.put("attachmentsFolderUri", attachmentsFolder.getUri().toString());
            result.put("backupsFolderUri", backupsFolder.getUri().toString());
            result.put("dataFileUri", dataFile.getUri().toString());

            call.resolve(result);
        } catch (Exception error) {
            call.reject("Błąd inicjalizacji folderu OneSync: " + error.getMessage());
        }
    }

    @PluginMethod
    public void readDataFile(PluginCall call) {
        try {
            DocumentFile rootFolder = getSelectedRootFolder();

            if (rootFolder == null) {
                call.reject("Nie wybrano folderu OneSync.");
                return;
            }

            DocumentFile dataFolder = rootFolder.findFile(DATA_DIRECTORY);

            if (dataFolder == null || !dataFolder.isDirectory()) {
                call.resolve(new JSObject().put("exists", false));
                return;
            }

            DocumentFile dataFile = dataFolder.findFile(DATA_FILE_NAME);

            if (dataFile == null || !dataFile.isFile()) {
                call.resolve(new JSObject().put("exists", false));
                return;
            }

            String content = readTextFromDocument(dataFile);

            JSObject result = new JSObject();
            result.put("exists", true);
            result.put("content", content);
            result.put("uri", dataFile.getUri().toString());

            call.resolve(result);
        } catch (Exception error) {
            call.reject("Błąd odczytu data/data.json: " + error.getMessage());
        }
    }

    @PluginMethod
    public void writeDataFile(PluginCall call) {
        String content = call.getString("content");

        if (content == null) {
            call.reject("Brak treści JSON do zapisania.");
            return;
        }

        try {
            DocumentFile rootFolder = getSelectedRootFolder();

            if (rootFolder == null || !rootFolder.canWrite()) {
                call.reject("Brak dostępu do zapisu w folderze OneSync.");
                return;
            }

            DocumentFile dataFolder = getOrCreateDirectory(rootFolder, DATA_DIRECTORY);

            if (dataFolder == null) {
                call.reject("Nie udało się otworzyć katalogu data.");
                return;
            }

            DocumentFile dataFile = dataFolder.findFile(DATA_FILE_NAME);

            if (dataFile == null) {
                dataFile = dataFolder.createFile("application/json", DATA_FILE_NAME);
            }

            if (dataFile == null) {
                call.reject("Nie udało się utworzyć pliku data/data.json.");
                return;
            }

            writeTextToDocument(dataFile, content);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("uri", dataFile.getUri().toString());

            call.resolve(result);
        } catch (Exception error) {
            call.reject("Błąd zapisu data/data.json: " + error.getMessage());
        }
    }

    private DocumentFile getSelectedRootFolder() {
        SharedPreferences preferences = getContext().getSharedPreferences(
            PREFS_NAME,
            Activity.MODE_PRIVATE
        );

        String treeUri = preferences.getString(KEY_TREE_URI, null);

        if (treeUri == null || treeUri.isEmpty()) {
            return null;
        }

        return DocumentFile.fromTreeUri(getContext(), Uri.parse(treeUri));
    }

    private DocumentFile getOrCreateDirectory(DocumentFile parent, String directoryName) {
        DocumentFile directory = parent.findFile(directoryName);

        if (directory != null && directory.isDirectory()) {
            return directory;
        }

        return parent.createDirectory(directoryName);
    }

    private String readTextFromDocument(DocumentFile file) throws Exception {
        InputStream inputStream = getContext()
            .getContentResolver()
            .openInputStream(file.getUri());

        if (inputStream == null) {
            throw new Exception("Nie udało się otworzyć pliku do odczytu.");
        }

        StringBuilder content = new StringBuilder();

        try (
            InputStream stream = inputStream;
            BufferedReader reader = new BufferedReader(
                new InputStreamReader(stream, StandardCharsets.UTF_8)
            )
        ) {
            String line;

            while ((line = reader.readLine()) != null) {
                content.append(line).append("\n");
            }
        }

        return content.toString();
    }

    private void writeTextToDocument(DocumentFile file, String content) throws Exception {
        OutputStream outputStream = getContext()
            .getContentResolver()
            .openOutputStream(file.getUri(), "wt");

        if (outputStream == null) {
            throw new Exception("Nie udało się otworzyć pliku do zapisu.");
        }

        try (OutputStream stream = outputStream) {
            stream.write(content.getBytes(StandardCharsets.UTF_8));
            stream.flush();
        }
    }

    private void handleFolderPickerResult(ActivityResult result) {
        if (pendingCall == null) {
            return;
        }

        PluginCall call = pendingCall;
        pendingCall = null;

        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("cancelled", true);
            call.resolve(cancelled);
            return;
        }

        Uri treeUri = result.getData().getData();

        if (treeUri == null) {
            call.reject("Nie udało się odczytać wybranego folderu.");
            return;
        }

        try {
            int takeFlags = result.getData().getFlags()
                & (Intent.FLAG_GRANT_READ_URI_PERMISSION
                    | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);

            getContext().getContentResolver().takePersistableUriPermission(
                treeUri,
                takeFlags
            );

            getContext()
                .getSharedPreferences(PREFS_NAME, Activity.MODE_PRIVATE)
                .edit()
                .putString(KEY_TREE_URI, treeUri.toString())
                .apply();

            JSObject response = new JSObject();
            response.put("cancelled", false);
            response.put("selected", true);
            response.put("treeUri", treeUri.toString());

            call.resolve(response);
        } catch (Exception error) {
            call.reject(
                "Nie udało się zapisać trwałego dostępu do folderu: "
                    + error.getMessage()
            );
        }
    }
}