package pl.mpasiowiec.autodziennik;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OneSyncFolderPlugin.class);
        super.onCreate(savedInstanceState);
    }
}