using UnityEngine;
using System.Collections;

public class CamPlane : MonoBehaviour 
{
    public Texture2D CamTexture
    {
        set 
        {
            this.GetComponentInChildren<Renderer>().material.mainTexture = value;
        }
    }
    float vfov_ = 44.30f;
    float distLen_ = 4.0f;
    public float VFov
    {
        set { vfov_ = value; updateCalcPosScale_(); }
    }
    GameObject child_;

    void updateCalcPosScale_()
    {
        var vfovRad = vfov_ * Mathf.Deg2Rad;

        var vLen = (float)System.Math.Tan(vfovRad / 2.0f) * distLen_ * 2.0f;

        child_.transform.localScale = new Vector3(vLen * (320.0f / 240.0f), vLen, 0);
        child_.transform.localPosition = new Vector3(0, 0, distLen_);
    }

	// Use this for initialization
	void Start () 
    {
        child_ = transform.FindChild("CamPlaneMesh").gameObject;
        child_.transform.localPosition = new Vector3(0.0f, 0, 3.0f);
        updateCalcPosScale_();
    }
	
	// Update is called once per frame
	void Update () {
        var p = child_.transform.localPosition;
        p.z += 0.001f;
        child_.transform.localPosition = p;
    }
}
