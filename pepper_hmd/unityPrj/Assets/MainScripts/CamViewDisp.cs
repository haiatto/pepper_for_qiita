using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class CamViewDisp : SingletonMonoBehaviour<MonoBehaviour>
{
    public CamPlane SrcCamPlanePrefab;

    public float UpdateTime;
    
    protected float timer_;
    
    List<CamPlane> camPlaneLst_ = new List<CamPlane>();

    // Use this for initialization
    void Start()
    {
        timer_ = UpdateTime;
    }

    // Update is called once per frame
    void Update()
    {
        timer_ -= Time.deltaTime;
        //Debug.Log(timer_);
        if (timer_ < 0)
        {
            timer_ += UpdateTime;
            PutCamPlane();
        }
    }
    void PutCamPlane()
    {
        if (Main.Instance.CameraTextureTop != null)
        {
            var camPlane = Instantiate(SrcCamPlanePrefab) as CamPlane;
            camPlaneLst_.Add(camPlane);

            camPlane.CamTexture = Main.Instance.CameraTextureTop;
            if (Main.Instance.JointAngleTbl != null)
            {
                var yaw = Main.Instance.JointAngleTbl["HeadYaw"] * Mathf.Rad2Deg;
                var pitch = Main.Instance.JointAngleTbl["HeadPitch"] * Mathf.Rad2Deg;
                camPlane.transform.Rotate(new Vector3(pitch, -yaw, 0));
                camPlane.transform.Translate(new Vector3(0,1.2f,0));
            }
        }
        if (Main.Instance.CameraTextureBottom != null)
        {
            var camPlane = Instantiate(SrcCamPlanePrefab) as CamPlane;
            camPlaneLst_.Add(camPlane);

            camPlane.CamTexture = Main.Instance.CameraTextureBottom;
            if (Main.Instance.JointAngleTbl != null)
            {
                var yaw = Main.Instance.JointAngleTbl["HeadYaw"] * Mathf.Rad2Deg;
                var pitch = Main.Instance.JointAngleTbl["HeadPitch"] * Mathf.Rad2Deg + 40.0f;
                camPlane.transform.Rotate(new Vector3(pitch, -yaw, 0));
                camPlane.transform.Translate(new Vector3(0, 1.2f, 0));
            }
        }
        while (camPlaneLst_.Count > 30)
        {
            GameObject.Destroy(camPlaneLst_[0].gameObject);
            camPlaneLst_.RemoveAt(0);
        }
    }
}
