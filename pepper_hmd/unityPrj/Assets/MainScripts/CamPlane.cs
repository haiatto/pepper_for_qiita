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
        //var vfovRad = vfov_ * Mathf.Deg2Rad;
        //var vLen = (float)System.Math.Tan(vfovRad / 2.0f) * distLen_ * 2.0f;
        //child_.transform.localScale = new Vector3(vLen * (320.0f / 240.0f), vLen, 0);
        //child_.transform.localPosition = new Vector3(0, 0, distLen_);
    }
    Mesh createMesh_()
    {
        Mesh mesh = new Mesh();

        var vfovRad = vfov_ * Mathf.Deg2Rad;
        var hfov = vfov_ * (320.0f / 240.0f);
        var vLen = (float)System.Math.Tan(vfovRad / 2.0f) * distLen_ * 2.0f;
        var hLen = vLen * (320.0f / 240.0f);

        var numV = 5;
        var numH = 5;

        var vertices = new Vector3[numV * numH];
        var uv = new Vector2[numV * numH];
        var triangles = new int[(numV - 1) * (numH - 1) * 3 * 2];
        for (var y = 0; y < numV; ++y)
        {
            for (var x = 0; x < numH; ++x)
            {
                var rx = x / (float)numH;
                var ry = y / (float)numV;
                var v = new Vector3(
                    0,//hLen * rx - (hLen / 2.0f), 
                    0,//vLen * ry - (vLen / 2.0f), 
                    distLen_
                );
                var q = new Quaternion();
                q.eulerAngles = new Vector3(
                    -ry * vfov_ + vfov_ / 2.0f,
                    -rx * hfov + hfov / 2.0f, 
                    0
                );
                vertices[y * numH + x] = q * v;
                uv[y * numH + x] = new Vector2(rx, ry);
            }
        }
        for (var y = 0; y < numV-1; ++y)
        {
            for (var x = 0; x < numH-1; ++x)
            {
                var baseIdx    = (y * (numH - 1) + x) * 3 * 2;
                var baseVtxIdx = (y * (numH) + x);
                triangles[baseIdx + 0] = baseVtxIdx + 0;
                triangles[baseIdx + 1] = baseVtxIdx + 1;
                triangles[baseIdx + 2] = baseVtxIdx + 1 + numH;
                triangles[baseIdx + 3] = baseVtxIdx + 1 + numH;
                triangles[baseIdx + 4] = baseVtxIdx + 0 + numH;
                triangles[baseIdx + 5] = baseVtxIdx + 0;
            }
        }
        mesh.vertices = vertices;
        mesh.uv = uv;
        mesh.triangles = triangles;
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();

        return mesh;
    }

	// Use this for initialization
	void Start () 
    {
        child_ = transform.FindChild("CamPlaneMesh").gameObject;
        child_.transform.localPosition = new Vector3(0.0f, 0.0f, 0.0f);
        updateCalcPosScale_();
        child_.GetComponent<MeshFilter>().sharedMesh = createMesh_();
    }
	
	// Update is called once per frame
	void Update () {
        var p = child_.transform.localPosition;
        p.z += 0.001f;
        child_.transform.localPosition = p;
    }
}
