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
    GameObject child_;

	// Use this for initialization
	void Start () 
    {
        child_ = transform.FindChild("CamPlaneMesh").gameObject;
        child_.transform.localPosition = new Vector3(0.0f, 0, 3.0f);
    }
	
	// Update is called once per frame
	void Update () {
        var p = child_.transform.localPosition;
        p.z += 0.001f;
        child_.transform.localPosition = p;
    }
}
