#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using System.Collections;

public class PepperAssetPostProcessor : AssetPostprocessor {
    /// <summary>
    /// すべてのアセットのインポートが終了した際に呼び出されます
    /// </summary>
    /// <param name="importedAssets">インポートされたアセットのパス</param>
    /// <param name="deletedAssets">削除されたアセットのパス</param>
    /// <param name="movedAssets">移動したアセットの移動後のパス</param>
    /// <param name="movedFromPath">移動したアセットの移動前のパス</param>
    static void OnPostprocessAllAssets(
        string[] importedAssets, 
        string[] deletedAssets, 
        string[] movedAssets, 
        string[] movedFromPath)
    {
        foreach (var str in importedAssets)
        {
            if (str.IndexOf(".urdf") > 0)
            {
                var newAsset = str.Replace(".urdf", ".xml");
                AssetDatabase.DeleteAsset(newAsset);
                if (AssetDatabase.CopyAsset(str, newAsset))
                {
                    Debug.Log("Copy: " + str + " -> " + newAsset);
                }
            }
        }
    }
}
#endif