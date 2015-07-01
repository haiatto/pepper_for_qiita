using UnityEngine;
using System.Collections;

public class VRViewDisp : MonoBehaviour {

    GameObject centerEyeAnchor_;

	// Use this for initialization
	void Start () {
        centerEyeAnchor_ = GameObject.Find("Main Camera");
	}
	
	// Update is called once per frame
	void Update () {
        var pitch = centerEyeAnchor_.transform.rotation.eulerAngles.x;
        var yaw   = centerEyeAnchor_.transform.rotation.eulerAngles.y;
        if (pitch > 180) pitch = pitch - 360;
        if (yaw > 180) yaw = yaw - 360;
        
        Main.Instance.TargetHeadPitch = pitch * Mathf.Deg2Rad;
        Main.Instance.TargetHeadYaw   = -yaw * Mathf.Deg2Rad;
	}
}
