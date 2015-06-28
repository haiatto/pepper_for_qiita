using UnityEngine;
using System.Collections;

public class SingletonMonoBehaviour<T> : MonoBehaviour where T : MonoBehaviour
{
    private static T instance_;
    public static T Instance
    {
        get
        {
            return instance_;
        }
    }
    public void SetInstance(T instance)
    {
        if (instance_ != null)
        {
            Debug.Log("set multiply singleton instance");
            return;
        }
        instance_ = instance;
    }
    public void ClearInstance()
    {
        if (instance_ == null)
        {
            Debug.Log("no singleton instance");
            return;
        }
        instance_ = null;
    }
}
